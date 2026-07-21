import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";

class TurnstileSignin extends CredentialsSignin {
  code = "turnstile";
}

class BannedSignin extends CredentialsSignin {
  code = "banned";
}

class RateLimitSignin extends CredentialsSignin {
  code = "ratelimit";
}

// IP client (sau Vercel/proxy) từ header chuyển tiếp — dùng cho rate-limit login.
function ipFromRequest(request: Request | undefined): string {
  const xff = request?.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request?.headers.get("x-real-ip")?.trim() || "unknown";
}

// Ngưỡng brute-force đăng nhập trong cửa sổ 15 phút. Rate-limit LƯU TRONG BỘ NHỚ
// (per-instance trên serverless) — chống-abuse mềm, không tuyệt đối toàn cục.
// Đếm MỌI lần thử: bucket theo IP là lớp chính; bucket theo tài khoản chặn tấn
// công phân tán 1 account (đánh đổi: kẻ xấu spam email nạn nhân có thể tạm khoá
// login của họ ~15 phút — chấp nhận, ngưỡng để rộng).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_IP = 30;
const LOGIN_MAX_PER_ACCOUNT = 10;

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email hoặc Username", type: "text" },
      password: { label: "Mật khẩu", type: "password" },
      turnstileToken: { label: "Turnstile", type: "text" },
    },
    async authorize(credentials, request) {
      // Trường "email" thực chất nhận cả email lẫn username — form đăng
      // nhập cho phép người dùng gõ 1 trong 2 (xem AuthForms.tsx, nhãn
      // "Email hoặc Username"). Giữ nguyên tên field "email" trên wire để
      // không phải đổi mọi nơi gọi signIn("credentials", { email: ... }).
      const identifier = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      const turnstileToken = credentials?.turnstileToken as string | undefined;
      if (!identifier || !password) return null;

      // Rate-limit brute-force: theo IP (lớp chính) + theo tài khoản. Vượt ->
      // ném RateLimitSignin (client phân biệt qua code "ratelimit"). Kiểm TRƯỚC
      // khi truy DB/so bcrypt để không tốn tài nguyên cho request bị chặn.
      const ip = ipFromRequest(request as Request | undefined);
      const ipOk = rateLimit(`login-ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS).ok;
      const acctOk = rateLimit(
        `login-acct:${identifier.toLowerCase()}`,
        LOGIN_MAX_PER_ACCOUNT,
        LOGIN_WINDOW_MS
      ).ok;
      if (!ipOk || !acctOk) throw new RateLimitSignin();

      const turnstileOk = await verifyTurnstileToken(turnstileToken);
      if (!turnstileOk) throw new TurnstileSignin();

      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
      });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      // Tài khoản bị admin khoá (Admin > Người dùng) không đăng nhập được —
      // chặn ngay ở bước authorize() thay vì để lọt vào session rồi mới kiểm
      // tra rải rác ở từng route (xem requireUser() trong src/lib/authz.ts
      // cho các phiên ĐANG hoạt động khi bị khoá giữa chừng).
      if (user.banned) throw new BannedSignin();

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role as Role,
        walletBalance: user.walletBalance,
        banned: user.banned,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/dang-nhap",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "BUYER";
        token.walletBalance = (user as { walletBalance?: number }).walletBalance ?? 0;
        token.banned = (user as { banned?: boolean }).banned ?? false;
        await prisma.user
          .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
          .catch(() => {});
      } else if (token.id) {
        // Refresh role/balance from DB on subsequent requests so wallet
        // top-ups and role changes are reflected without re-login. Piggyback
        // a throttled lastActiveAt update here (dùng cho "Online X trước" ở
        // trang chi tiết sản phẩm) — throttle 2 phút để tránh ghi DB mỗi request.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });
        if (dbUser) {
          token.role = dbUser.role as Role;
          token.walletBalance = dbUser.walletBalance;
          // Đọc lại mỗi request refresh — nếu admin khoá tài khoản GIỮA
          // phiên đang hoạt động, session hiện tại nhận cờ banned=true ngay
          // trong vài phút (JWT refresh của Auth.js), requireUser() chặn
          // mọi hành động tiếp theo dù chưa đăng xuất/đăng nhập lại.
          token.banned = dbUser.banned;
          const staleMs = 2 * 60 * 1000;
          if (!dbUser.lastActiveAt || Date.now() - dbUser.lastActiveAt.getTime() > staleMs) {
            await prisma.user
              .update({ where: { id: dbUser.id }, data: { lastActiveAt: new Date() } })
              .catch(() => {});
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "BUYER";
        session.user.walletBalance = (token.walletBalance as number) ?? 0;
        session.user.banned = (token.banned as boolean) ?? false;
      }
      return session;
    },
  },
});
