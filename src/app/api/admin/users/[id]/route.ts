import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
  }
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Không thể khoá tài khoản quản trị viên." }, { status: 400 });
  }

  if (action === "ban") {
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : null;
    await prisma.user.update({
      where: { id },
      data: { banned: true, bannedReason: reason, bannedAt: new Date() },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Khoá tài khoản",
      targetType: "User",
      targetId: id,
      detail: reason ?? undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unban") {
    await prisma.user.update({
      where: { id },
      data: { banned: false, bannedReason: null, bannedAt: null },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Mở khoá tài khoản",
      targetType: "User",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
