import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";
import { verifyTurnstileToken } from "@/lib/turnstile";

class TurnstileSignin extends CredentialsSignin {
  code = "turnstile";
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email hoặc Username", type: "text" },
      password: { label: "Mật khẩu", type: "password" },
      turnstileToken: { label: "Turnstile", type: "text" },
    },
    async authorize(credentials) {
      // Trường "email" thực chất nhận cả email lẫn username — form đăng
      // nhập cho phép người dùng gõ 1 trong 2 (xem AuthForms.tsx, nhãn
      // "Email hoặc Username"). Giữ nguyên tên field "email" trên wire để
      // không phải đổi mọi nơi gọi signIn("credentials", { email: ... }).
      const identifier = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      const turnstileToken = credentials?.turnstileToken as string | undefined;
      if (!identifier || !password) return null;

      const turnstileOk = await verifyTurnstileToken(turnstileToken);
      if (!turnstileOk) throw new TurnstileSignin();

      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
      });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role as Role,
        walletBalance: user.walletBalance,
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
      }
      return session;
    },
  },
});
