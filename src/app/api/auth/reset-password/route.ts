import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { PASSWORD_RESET_MAX_ATTEMPTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Message DUY NHẤT cho MỌI trường hợp thất bại (không tìm thấy user, không
// có mã đang hiệu lực, mã hết hạn, mã đã bị khoá do nhập sai quá số lần, mã
// sai) — cố tình không phân biệt để không tạo kênh dò xem 1 email có tồn
// tại/đang có mã hiệu lực hay không (cùng nguyên tắc chống enumeration đã
// áp dụng ở forgot-password/route.ts).
const INVALID_MESSAGE = "Mã xác nhận không đúng hoặc đã hết hạn.";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// So sánh 2 hash SHA-256 (hex, luôn 64 ký tự) theo thời gian không đổi để
// tránh timing side-channel dò từng ký tự của hash.
function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code) || !password) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự." }, { status: 400 });
  }

  // Rate-limit theo CẢ email lẫn IP — giới hạn số lần đoán mã cho 1 email/IP
  // trong 1 cửa sổ ngắn, độc lập với khoá "sai quá N lần" theo từng mã cụ thể
  // bên dưới (2 lớp: 1 lớp theo request, 1 lớp theo đúng mã đang hiệu lực).
  const ip = clientIp(req);
  const ipOk = rateLimit(`reset-pw-ip:${ip}`, 20, 15 * 60 * 1000).ok;
  const emailOk = rateLimit(`reset-pw-email:${email}`, 10, 15 * 60 * 1000).ok;
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { error: "Bạn thử lại quá nhanh, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (
    !resetToken ||
    resetToken.expiresAt < new Date() ||
    resetToken.attempts >= PASSWORD_RESET_MAX_ATTEMPTS
  ) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  if (!hashesMatch(codeHash, resetToken.codeHash)) {
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
