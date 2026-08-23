import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";
import { rateLimit } from "@/lib/rate-limit";
import { sendSystemMessage } from "@/lib/system-bot";
import { verifyTurnstileToken } from "@/lib/turnstile";

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;

// Cùng message chung chung như nhánh kiểm tra trùng trước đó (LAUNCH_AUDIT.md
// #21) — dùng lại cho case RACE (2 request trùng email/username xử lý gần
// như đồng thời, cả 2 cùng vượt qua findFirst trước khi 1 trong 2 commit).
const DUPLICATE_MESSAGE =
  "Không thể đăng ký với thông tin đã nhập. Vui lòng thử lại với email/username khác, hoặc đăng nhập nếu bạn đã có tài khoản.";

// P2002 (unique constraint) trên field cụ thể — dùng để phân biệt race va
// trùng EMAIL/USERNAME (lỗi thật, không nên retry, trả 409 ngay) với va
// trùng referralCode (dự kiến được, vòng lặp bên dưới tự sinh mã mới thử
// lại). Không dùng try/catch chung chung nuốt mọi lỗi như trước (LAUNCH_AUDIT.md
// #20) — trước đây MỌI lỗi đều bị coi là "trùng referralCode" nên race trên
// email/username retry đủ 5 lần vô ích rồi mới trả 500 sai status.
function isUniqueViolationOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    (err.meta!.target as string[]).includes(field)
  );
}

export async function POST(req: Request) {
  // Rate-limit đăng ký theo IP — giữ NGUYÊN thông báo rõ ("email/username đã
  // dùng") để UX không bối rối, nhưng throttle để không thể dò email hàng loạt
  // (chống enumeration bằng cách làm chậm, xem SECURITY_AUDIT.md #4). 10/giờ.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!rateLimit(`register-ip:${ip}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const refCode =
    typeof body?.refCode === "string" && body.refCode.trim()
      ? body.refCode.trim().toUpperCase()
      : null;
  const turnstileToken =
    typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined;

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin." }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Xác minh chống spam thất bại, vui lòng thử lại." },
      { status: 400 }
    );
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username chỉ gồm chữ cái và số, không dấu, 3-20 ký tự." },
      { status: 400 }
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    // LAUNCH_AUDIT.md #21 — trước đây nói rõ "Email hoặc username này đã
    // được sử dụng", đủ để 1 kẻ dò kết hợp username ngẫu nhiên (chắc chắn
    // không trùng) + email mục tiêu để suy ra CHẮC CHẮN email đó đã có tài
    // khoản (email enumeration). Đổi sang message chung chung — cùng
    // nguyên tắc chống enumeration đã áp dụng ở forgot-password/route.ts —
    // vẫn hướng dẫn được hành động tiếp theo mà không xác nhận field nào
    // trùng.
    return NextResponse.json(
      {
        error:
          "Không thể đăng ký với thông tin đã nhập. Vui lòng thử lại với email/username khác, hoặc đăng nhập nếu bạn đã có tài khoản.",
      },
      { status: 409 }
    );
  }

  const referrer = refCode
    ? await prisma.user.findUnique({ where: { referralCode: refCode } })
    : null;
  if (refCode && !referrer) {
    return NextResponse.json({ error: "Mã mời không hợp lệ." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // IP đăng ký — dùng để GẮN CỜ (không chặn) cặp referrer–referred trùng IP,
  // giúp admin review farming hoa hồng (xem src/lib/commission.ts).
  const signupIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    null;

  // Sinh mã giới thiệu riêng cho user mới ngay lúc tạo — retry vài lần nếu
  // va trùng unique constraint (xác suất rất thấp, xem src/lib/referral.ts).
  // Lưu ý: đăng ký chỉ gắn quan hệ referredById, KHÔNG cộng hoa hồng ở đây —
  // hoa hồng tính theo % mỗi đơn hàng người được mời mua (sau khi đã nạp
  // tiền thật), kiểm tra ở POST /api/checkout (xem REFERRAL_COMMISSION_PERCENT
  // trong src/lib/constants.ts).
  let user: Awaited<ReturnType<typeof prisma.user.create>> | null = null;
  for (let attempt = 0; attempt < 5 && !user; attempt++) {
    try {
      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          name: username,
          role: "BUYER",
          walletBalance: 0,
          referralCode: generateReferralCode(),
          referredById: referrer?.id,
          signupIp,
        },
      });
    } catch (err) {
      // Race thật (2 request cùng email/username lọt qua findFirst gần như
      // đồng thời) — trả 409 ngay, KHÔNG retry (retry cũng sẽ luôn thất bại
      // vì nguyên nhân không đổi).
      if (isUniqueViolationOn(err, "email") || isUniqueViolationOn(err, "username")) {
        return NextResponse.json({ error: DUPLICATE_MESSAGE }, { status: 409 });
      }
      // Còn lại coi là trùng referralCode (xác suất rất thấp) — vòng lặp
      // thử lại với mã mới ở lượt kế tiếp.
    }
  }
  if (!user) {
    return NextResponse.json(
      { error: "Không thể tạo tài khoản, vui lòng thử lại." },
      { status: 500 }
    );
  }

  // Tin nhắn chào mừng chỉ mang tính thông báo — không để lỗi gửi tin (nếu
  // có) làm hỏng cả luồng đăng ký vốn đã thành công.
  try {
    await sendSystemMessage(
      user.id,
      `Chào mừng ${user.username} đến với MaketMMO!\n\nTài khoản của bạn đã được tạo thành công.\n\nMột số điều bạn có thể làm:\n• Mua sắm sản phẩm với giá tốt nhất\n• Nạp tiền để bắt đầu giao dịch\n• Đăng ký làm người bán để kiếm thu nhập\n\nNếu cần hỗ trợ, hãy nhắn tin cho chúng tôi!`
    );
  } catch {
    // bỏ qua — không chặn đăng ký nếu gửi tin chào mừng thất bại
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
