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

  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) {
    return NextResponse.json({ error: "Không tìm thấy gian hàng." }, { status: 404 });
  }

  if (action === "suspend") {
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : null;
    await prisma.seller.update({
      where: { id },
      data: { suspended: true, suspendedReason: reason, suspendedAt: new Date() },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Khoá gian hàng",
      targetType: "Seller",
      targetId: id,
      detail: `${seller.shopName}${reason ? ` — ${reason}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuspend") {
    await prisma.seller.update({
      where: { id },
      data: { suspended: false, suspendedReason: null, suspendedAt: null },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Mở khoá gian hàng",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
