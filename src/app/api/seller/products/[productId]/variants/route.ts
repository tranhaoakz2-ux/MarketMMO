import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
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
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const price = Number(body?.price);
  const stock = Number(body?.stock);

  if (!label || label.length < 3) {
    return NextResponse.json(
      { error: "Tên biến thể phải có ít nhất 3 ký tự." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(price) || price < 1000) {
    return NextResponse.json(
      { error: "Giá biến thể phải từ 1.000đ trở lên." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json(
      { error: "Số lượng kho phải là số nguyên không âm." },
      { status: 400 }
    );
  }

  const lastVariant = await prisma.productVariant.findFirst({
    where: { productId },
    orderBy: { sortOrder: "desc" },
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      label,
      price,
      stock,
      sortOrder: (lastVariant?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ variant });
}
