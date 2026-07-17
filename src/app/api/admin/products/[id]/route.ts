import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
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
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.product.update({
      where: { id },
      data: { status: "REJECTED", adminNote },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
