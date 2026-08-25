import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Đổi EMAIL đăng nhập của CHÍNH admin đang gọi — CHỈ dành cho admin (khác
// PATCH /api/user/profile vốn cố tình KHÔNG cho buyer/seller tự đổi email vì
// đó là định danh đăng nhập, xem comment ở route đó). Bắt buộc đúng mật khẩu
// hiện tại (cùng nguyên tắc chống-người-lạ-dùng-phiên-mở-sẵn như đổi mật
// khẩu, xem POST /api/user/change-password). Đăng nhập vẫn tra CẢ email lẫn
// username (auth.ts) nên đổi nhầm email không tự khoá đăng nhập hoàn toàn —
// username "admin" (seed mặc định) vẫn dùng được nếu còn nguyên.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newEmailRaw = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";

  if (!currentPassword || !newEmailRaw) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(newEmailRaw)) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { email: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Tài khoản này đăng nhập qua Google, không có mật khẩu để xác thực." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }

  if (newEmailRaw === user.email) {
    return NextResponse.json({ error: "Email mới trùng với email hiện tại." }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { id: session!.user.id }, data: { email: newEmailRaw } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Email này đã được dùng cho tài khoản khác." }, { status: 400 });
    }
    throw err;
  }

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đổi email đăng nhập admin",
    targetType: "User",
    targetId: session!.user!.id,
    detail: `${user.email ?? "(chưa có)"} -> ${newEmailRaw}`,
  });

  return NextResponse.json({ ok: true, email: newEmailRaw });
}
