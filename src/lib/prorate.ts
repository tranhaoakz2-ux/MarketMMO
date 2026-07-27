import { MIN_ITEM_PRICE_AFTER_DISCOUNT } from "@/lib/constants";

// Tính giá đã prorate cho 1 đơn vị ProductStockItem có thời hạn — giá =
// giá gói đầy đủ × (số ngày còn lại / nominalTermDays), có sàn tối thiểu
// tái dùng MIN_ITEM_PRICE_AFTER_DISCOUNT (đã dùng cho mã giảm giá) để tránh
// giá tụt về gần 0 khi chỉ còn 1-2 ngày. `daysRemaining` làm tròn LÊN
// (Math.ceil) và sàn tối thiểu 1 ngày — đơn vị đã hết hạn không được gọi
// hàm này (checkout đã lọc loại khỏi diện có thể claim, xem POST
// /api/checkout).
export function computeProratedPrice(
  basePrice: number,
  nominalTermDays: number,
  expiresAt: Date,
  now: Date = new Date()
): { price: number; daysRemaining: number; percentRemaining: number } {
  const daysRemaining = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );
  const percentRemaining = Math.min(1, daysRemaining / nominalTermDays);
  const raw = Math.round(basePrice * percentRemaining);
  const price = Math.max(MIN_ITEM_PRICE_AFTER_DISCOUNT, Math.min(raw, basePrice));
  return { price, daysRemaining, percentRemaining };
}
