import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { MAX_PRODUCT_PRICE_VND, MAX_PRODUCT_STOCK } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

async function loadOwnedVariant(
  sellerId: string,
  productId: string,
  variantId: string
) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || variant.productId !== productId || variant.product.sellerId !== sellerId) {
    return null;
  }
  return variant;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string; variantId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { productId, variantId } = await params;
  const variant = await loadOwnedVariant(seller!.id, productId, variantId);
  if (!variant) {
    return NextResponse.json({ error: "Phiên bản không tồn tại." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: { label?: string; price?: number; stock?: number } = {};

  if (body?.label !== undefined) {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label || label.length < 3) {
      return NextResponse.json(
        { error: "Tên phiên bản phải có ít nhất 3 ký tự." },
        { status: 400 }
      );
    }
    data.label = label;
  }
  if (body?.price !== undefined) {
    const price = Number(body.price);
    // PRODUCT_LISTING_AUDIT.md #5 — cùng lớp bug với route tạo variant/sản
    // phẩm gốc.
    if (!Number.isInteger(price) || price < 1000 || price > MAX_PRODUCT_PRICE_VND) {
      return NextResponse.json(
        {
          error: `Giá phiên bản phải là số nguyên, từ 1.000đ đến ${MAX_PRODUCT_PRICE_VND.toLocaleString("vi-VN")}đ.`,
        },
        { status: 400 }
      );
    }
    data.price = price;
  }
  if (body?.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_PRODUCT_STOCK) {
      return NextResponse.json(
        { error: `Số lượng kho phải là số nguyên từ 0 đến ${MAX_PRODUCT_STOCK.toLocaleString("vi-VN")}.` },
        { status: 400 }
      );
    }
    data.stock = stock;
  }

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data,
  });

  return NextResponse.json({ variant: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string; variantId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { productId, variantId } = await params;
  const variant = await loadOwnedVariant(seller!.id, productId, variantId);
  if (!variant) {
    return NextResponse.json({ error: "Phiên bản không tồn tại." }, { status: 404 });
  }

  // Dọn các bản ghi kho thật CHƯA BÁN của variant này TRƯỚC khi xoá — nếu
  // không, variantId của chúng sẽ tự SetNull (xem prisma/schema.prisma) và
  // vô tình "mồ côi" lẫn sang kho của Product gốc (sai dữ liệu khi Product
  // vẫn còn variant khác). Bản ghi ĐÃ BÁN giữ nguyên (SetNull tự động) để
  // không mất lịch sử giao hàng của buyer.
  await prisma.$transaction([
    prisma.productStockItem.deleteMany({ where: { variantId, status: "AVAILABLE" } }),
    prisma.productVariant.delete({ where: { id: variantId } }),
  ]);
  return NextResponse.json({ ok: true });
}
