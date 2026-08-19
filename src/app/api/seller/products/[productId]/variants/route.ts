import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { MAX_PRODUCT_PRICE_VND, MAX_PRODUCT_STOCK, PRODUCT_MAX_VARIANTS } from "@/lib/constants";
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
      { error: "Tên phiên bản phải có ít nhất 3 ký tự." },
      { status: 400 }
    );
  }
  // PRODUCT_LISTING_AUDIT.md #5 — cùng lớp bug với sản phẩm gốc: giá không
  // nguyên/vượt Int32 lọt qua Number.isFinite rồi gây lỗi runtime khi ghi
  // Postgres Int.
  if (!Number.isInteger(price) || price < 1000 || price > MAX_PRODUCT_PRICE_VND) {
    return NextResponse.json(
      {
        error: `Giá phiên bản phải là số nguyên, từ 1.000đ đến ${MAX_PRODUCT_PRICE_VND.toLocaleString("vi-VN")}đ.`,
      },
      { status: 400 }
    );
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_PRODUCT_STOCK) {
    return NextResponse.json(
      { error: `Số lượng kho phải là số nguyên từ 0 đến ${MAX_PRODUCT_STOCK.toLocaleString("vi-VN")}.` },
      { status: 400 }
    );
  }

  // PRODUCT_LISTING_AUDIT.md #8 — trước đây không giới hạn số variant/sản
  // phẩm.
  const variantCount = await prisma.productVariant.count({ where: { productId } });
  if (variantCount >= PRODUCT_MAX_VARIANTS) {
    return NextResponse.json(
      { error: `Sản phẩm đã đạt tối đa ${PRODUCT_MAX_VARIANTS} phiên bản.` },
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
