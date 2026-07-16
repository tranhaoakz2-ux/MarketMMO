import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PASSWORD_RESET_TOKEN_EXPIRY_MINUTES } from "@/lib/constants";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const GENERIC_MESSAGE =
  "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục spam).";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Không tiết lộ email có tồn tại hay không (tránh dò tài khoản) — luôn trả
  // cùng 1 message dù không tìm thấy user, hoặc user chỉ đăng nhập qua Google
  // (không có passwordHash nên không có gì để "đặt lại").
  if (user && user.passwordHash) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await prisma.$transaction([
      // Vô hiệu các link reset cũ chưa dùng của user này — chỉ 1 link có
      // hiệu lực tại 1 thời điểm.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/dat-lai-mat-khau?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch {
      // Không tiết lộ lỗi gửi email ra response — tránh dùng lỗi gửi mail để
      // dò xem email có tồn tại trong hệ thống hay không.
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
