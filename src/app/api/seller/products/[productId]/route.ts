import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Sản phẩm không tồn tại." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.preOrder !== "boolean") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { preOrder: body.preOrder },
  });

  return NextResponse.json({ preOrder: updated.preOrder });
}
