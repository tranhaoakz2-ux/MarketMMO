import { MIN_ITEM_PRICE_AFTER_DISCOUNT } from "@/lib/constants";

export type DiscountRecord = {
  type: string; // "PERCENT" | "FIXED"
  value: number;
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
};

export function isDiscountCodeUsable(discount: DiscountRecord): boolean {
  if (!discount.active) return false;
  if (discount.expiresAt && discount.expiresAt.getTime() < Date.now()) return false;
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) return false;
  return true;
}

/** Số tiền giảm cho TOÀN BỘ phần thuộc 1 seller (chưa chia theo từng dòng). */
export function computeDiscountAmount(
  discount: Pick<DiscountRecord, "type" | "value">,
  eligibleSubtotal: number
): number {
  if (eligibleSubtotal <= 0) return 0;
  const raw =
    discount.type === "PERCENT"
      ? Math.round((eligibleSubtotal * discount.value) / 100)
      : discount.value;
  return Math.min(raw, eligibleSubtotal);
}

/**
 * Chia đều số tiền giảm cho từng dòng hàng của seller đó theo tỉ lệ giá trị
 * dòng, dòng cuối nhận phần dư để tổng luôn khớp chính xác `discountAmount`
 * (tránh lệch vài đồng do làm tròn). Có sàn MIN_ITEM_PRICE_AFTER_DISCOUNT/đơn
 * vị để một mã FIXED giá trị lớn không đưa giá 1 sản phẩm về gần 0 ngoài ý
 * muốn — nếu chạm sàn, phần giảm dư KHÔNG chuyển sang dòng khác (chấp nhận
 * giảm ít hơn giá trị mã trong trường hợp hiếm này, an toàn hơn là giảm quá).
 */
export function distributeDiscount<T extends { price: number; quantity: number }>(
  items: T[],
  discountAmount: number
): { items: T[]; actualDiscount: number } {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (subtotal <= 0 || discountAmount <= 0) {
    return { items, actualDiscount: 0 };
  }

  let remaining = discountAmount;
  let actualDiscount = 0;
  const result = items.map((item, idx) => {
    const lineTotal = item.price * item.quantity;
    const isLast = idx === items.length - 1;
    let share = isLast ? remaining : Math.round((discountAmount * lineTotal) / subtotal);
    share = Math.min(share, remaining, lineTotal);

    const floorTotal = MIN_ITEM_PRICE_AFTER_DISCOUNT * item.quantity;
    const targetLineTotal = Math.max(floorTotal, lineTotal - share);
    const newUnitPrice = Math.floor(targetLineTotal / item.quantity);
    // actualDiscount PHẢI suy ra từ giá trị nguyên thực tế (không dùng `share`
    // trực tiếp) — sai số làm tròn khi chia lineTotal/quantity có thể khiến
    // tổng tiền sau giảm KHÔNG khớp đúng subtotal - actualDiscount nếu dùng
    // `share` (đã bắt được bug này qua script test độc lập trước khi tích hợp
    // vào checkout — xem lịch sử).
    const achievedLineTotal = newUnitPrice * item.quantity;
    const achievedShare = lineTotal - achievedLineTotal;

    remaining -= achievedShare;
    actualDiscount += achievedShare;
    return { ...item, price: newUnitPrice };
  });

  return { items: result, actualDiscount };
}
