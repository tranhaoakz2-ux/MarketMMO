import { NextResponse } from "next/server";
import { requireUserRateLimited } from "@/lib/authz";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { prisma } from "@/lib/prisma";

type PreviewItem = { productId: string; variantId?: string; quantity: number };

// Phản hồi ĐỒNG NHẤT cho MỌI trường hợp mã không dùng được (không tồn tại / hết
// hạn / không áp dụng cho giỏ này): cùng status 200 + cùng shape { valid:false }.
// Cố ý KHÔNG phân biệt 404/400 hay nêu tên shop — chống oracle brute-force dò mã
// (xem AUDIT.md nhóm 1). Chỉ khi mã HỢP LỆ VÀ áp được mới trả valid:true kèm số
// tiền giảm (đây là mục đích của preview, không tránh được).
// Factory (KHÔNG dùng 1 instance dùng chung): body của Response chỉ đọc được 1
// lần, tái dùng cùng object cho nhiều request sẽ trả body rỗng ở lần thứ 2.
const invalid = () => NextResponse.json({ valid: false, discountAmount: 0 });

// Chỉ XEM TRƯỚC số tiền được giảm — KHÔNG tăng usedCount, KHÔNG đụng tiền.
// POST /api/checkout mới là nơi áp dụng thật (tính lại độc lập, không tin
// kết quả preview này) để tránh client giả mạo discountAmount.
export async function POST(req: Request) {
  // Yêu cầu đăng nhập + rate-limit (20 lần/phút/user) — chặn ẩn danh dò mã.
  const { error } = await requireUserRateLimited("discount-preview", 20, 60_000);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const items: PreviewItem[] = Array.isArray(body?.items) ? body.items : [];

  if (!code || items.length === 0) {
    // Thiếu input hợp lệ — vẫn trả phản hồi đồng nhất, không rò gì.
    return invalid();
  }

  const discount = await prisma.discountCode.findUnique({
    where: { code },
    include: { seller: { select: { shopName: true } } },
  });
  if (!discount || !isDiscountCodeUsable(discount)) {
    return invalid();
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
    return invalid();
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
