import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";
import { sendSystemMessage } from "@/lib/system-bot";
import { verifyTurnstileToken } from "@/lib/turnstile";

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;

export async function POST(req: Request) {
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
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mật khẩu phải có ít nhất 6 ký tự." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email hoặc username này đã được sử dụng." },
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
    } catch {
      // Trùng referralCode — vòng lặp thử lại với mã mới.
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
      `Chào mừng ${user.username} đến với MarketMMO!\n\nTài khoản của bạn đã được tạo thành công.\n\nMột số điều bạn có thể làm:\n• Mua sắm sản phẩm với giá tốt nhất\n• Nạp tiền để bắt đầu giao dịch\n• Đăng ký làm người bán để kiếm thu nhập\n\nNếu cần hỗ trợ, hãy nhắn tin cho chúng tôi!`
    );
  } catch {
    // bỏ qua — không chặn đăng ký nếu gửi tin chào mừng thất bại
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
