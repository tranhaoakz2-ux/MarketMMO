import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Đổi mật khẩu khi ĐANG ĐĂNG NHẬP — khác luồng "Quên mật khẩu" (OTP qua
// email, dùng khi KHÔNG đăng nhập được). Bắt buộc đúng mật khẩu cũ trước khi
// đổi (khác reset-password vốn xác thực bằng mã OTP thay cho mật khẩu cũ).
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Tài khoản này đăng nhập qua Google, không có mật khẩu để đổi." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session!.user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
