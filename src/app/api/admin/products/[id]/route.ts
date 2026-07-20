import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.slice(0, 500) : null;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }
  if (product.status !== "PENDING") {
    return NextResponse.json({ error: "Sản phẩm này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.product.update({
      where: { id },
      data: { status: "APPROVED", adminNote },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Duyệt sản phẩm",
      targetType: "Product",
      targetId: id,
      detail: product.name,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.product.update({
      where: { id },
      data: { status: "REJECTED", adminNote },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Từ chối sản phẩm",
      targetType: "Product",
      targetId: id,
      detail: adminNote ?? product.name,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
