import { MIN_ITEM_PRICE_AFTER_DISCOUNT } from "@/lib/constants";

export type MegaSaleFields = {
  megaSaleActive: boolean;
  megaSaleType: string | null;
  megaSalePercent: number | null;
  megaSaleFixedPrice: number | null;
  megaSaleEndsAt: Date | null;
};

export type EffectivePrice = {
  price: number;
  isSaleActive: boolean;
  percentOff: number | null;
};

// Đang sale THẬT SỰ hay không tại thời điểm `now` — kiểm tra cả cờ bật VÀ
// hạn hẹn giờ (nếu có). Cửa sổ hết hạn tính REAL-TIME ở đây, không cần cron
// tự đổi megaSaleActive về false trong DB — an toàn hơn cron vì không có
// rủi ro "cron lỗi/chưa chạy thì giá vẫn sai".
export function isMegaSaleActive(sale: MegaSaleFields, now: Date = new Date()): boolean {
  if (!sale.megaSaleActive) return false;
  if (sale.megaSaleEndsAt && sale.megaSaleEndsAt <= now) return false;
  return true;
}

// Tính giá HIỆU LỰC cho 1 mức giá gốc bất kỳ (Product.price, Product.priceMax,
// hoặc ProductVariant.price) — dùng CHUNG DUY NHẤT ở MỌI nơi cần giá sau Mega
// Sale: hiển thị card/chi tiết (mapProduct() trong src/lib/queries.ts) VÀ
// tính tiền THẬT lúc checkout (POST /api/checkout — gọi hàm này TRƯỚC bước
// prorate theo hạn dùng, xem src/lib/prorate.ts, để 2 cơ chế không đá nhau:
// Mega Sale quyết định "giá niêm yết" trước, prorate co tiếp giá đó theo %
// ngày còn lại của đúng đơn vị kho đã claim). Không có 2 nguồn giá song song.
export function computeEffectivePrice(
  basePrice: number,
  sale: MegaSaleFields,
  now: Date = new Date()
): EffectivePrice {
  if (!isMegaSaleActive(sale, now)) {
    return { price: basePrice, isSaleActive: false, percentOff: null };
  }

  let salePrice: number;
  if (sale.megaSaleType === "FIXED" && sale.megaSaleFixedPrice != null) {
    salePrice = sale.megaSaleFixedPrice;
  } else if (sale.megaSaleType === "PERCENT" && sale.megaSalePercent != null) {
    salePrice = Math.round((basePrice * (100 - sale.megaSalePercent)) / 100);
  } else {
    // Cấu hình thiếu/hỏng — fail-safe về giá gốc, không bao giờ đoán mò.
    return { price: basePrice, isSaleActive: false, percentOff: null };
  }

  // Chặn cứng: giá sale luôn RẺ HƠN giá gốc ít nhất 1đ và không bao giờ dưới
  // sàn tối thiểu hệ thống (an toàn tiền, đặc biệt với kiểu FIXED do seller
  // gõ tay tự do — có thể gõ nhầm giá cao hơn/bằng giá gốc).
  salePrice = Math.max(MIN_ITEM_PRICE_AFTER_DISCOUNT, Math.min(salePrice, basePrice - 1));
  if (salePrice >= basePrice) {
    // basePrice quá thấp (đã ở sàn tối thiểu) — không còn chỗ để giảm thêm,
    // coi như không sale để tránh hiện badge "-0%" vô nghĩa.
    return { price: basePrice, isSaleActive: false, percentOff: null };
  }

  const percentOff = Math.round(((basePrice - salePrice) / basePrice) * 100);
  return { price: salePrice, isSaleActive: true, percentOff };
}
