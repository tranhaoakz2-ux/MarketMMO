import { NextResponse } from "next/server";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { prisma } from "@/lib/prisma";

type PreviewItem = { productId: string; variantId?: string; quantity: number };

// Chỉ XEM TRƯỚC số tiền được giảm — KHÔNG tăng usedCount, KHÔNG đụng tiền.
// POST /api/checkout mới là nơi áp dụng thật (tính lại độc lập, không tin
// kết quả preview này) để tránh client giả mạo discountAmount.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const items: PreviewItem[] = Array.isArray(body?.items) ? body.items : [];

  if (!code) {
    return NextResponse.json({ error: "Vui lòng nhập mã giảm giá." }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "Giỏ hàng trống." }, { status: 400 });
  }

  const discount = await prisma.discountCode.findUnique({
    where: { code },
    include: { seller: { select: { shopName: true } } },
  });
  if (!discount) {
    return NextResponse.json({ error: "Mã giảm giá không tồn tại." }, { status: 404 });
  }
  if (!isDiscountCodeUsable(discount)) {
    return NextResponse.json(
      { error: "Mã giảm giá đã hết hạn hoặc không còn khả dụng." },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, sellerId: discount.sellerId },
    include: { variants: true },
  });

  const eligibleLines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const price = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)?.price
        : product.price;
      if (price === undefined) return null;
      return { price, quantity: item.quantity };
    })
    .filter((x): x is { price: number; quantity: number } => x !== null);

  if (eligibleLines.length === 0) {
    return NextResponse.json(
      { error: `Mã giảm giá này chỉ áp dụng cho sản phẩm của "${discount.seller.shopName}".` },
      { status: 400 }
    );
  }

  const eligibleSubtotal = eligibleLines.reduce((s, i) => s + i.price * i.quantity, 0);
  const rawDiscount = computeDiscountAmount(discount, eligibleSubtotal);
  const { actualDiscount } = distributeDiscount(eligibleLines, rawDiscount);

  return NextResponse.json({
    valid: true,
    discountAmount: actualDiscount,
    sellerName: discount.seller.shopName,
  });
}
