// Nguồn sự thật DUY NHẤT cho "hết hàng" — dùng chung ProductCard.tsx (badge),
// BuyBox.tsx (chặn nút mua), ProductVariantManager.tsx (banner cảnh báo
// seller) và getSellerOutOfStockCount() (badge sidebar), tính LIVE từ
// Product.stock/ProductVariant.stock (không lưu cột trạng thái riêng — tránh
// lệch đồng bộ, tự động đúng ngay khi seller bơm thêm kho vì đọc số hiện
// tại, không phải cờ đóng băng).
//
// CHỈ áp dụng cho loại hàng mà checkout THẬT SỰ dùng `stock` để giới hạn mua
// (đúng logic `guardLegacyStock` trong POST /api/checkout — dịch vụ/TUT-Trick/
// VPS-thủ-công không có khái niệm tồn kho, checkout bỏ qua check tồn kho cho
// các loại này; sản phẩm đang "Đặt trước" cố tình cho stock=0/âm, đó là trạng
// thái BÌNH THƯỜNG "sắp có hàng" chứ không phải hết hàng thật).
//
// Kiểu tham số CỐ TÌNH là structural type tối thiểu (không import type
// `Product` đầy đủ) — cho phép tái dùng với query Prisma nhẹ (chỉ select
// đúng vài cột cần) ở server thay vì bắt buộc phải gọi getMySellerProducts()
// (nặng hơn nhiều) chỉ để đếm badge. `Product` (data/products.ts) tự nhiên
// khớp type này nên mọi nơi đang gọi với `Product` đầy đủ không cần đổi gì.
export type StockCheckInput = {
  stock: number;
  variants?: { stock: number }[];
  productType?: string;
  deliveryMethod?: string;
  preOrder?: boolean;
};

export function isOutOfStock(product: StockCheckInput): boolean {
  // productType undefined chỉ xảy ra ở data/mock tĩnh (demo) — DB thật luôn
  // có giá trị (default "PRODUCT" ở schema), coi undefined như "PRODUCT" cho
  // nhất quán với hành vi mặc định đó.
  const productType = product.productType ?? "PRODUCT";
  const appliesStockGate =
    (productType === "PRODUCT" || productType === "TOOL") &&
    product.deliveryMethod !== "MANUAL_PROVISION" &&
    !product.preOrder;
  if (!appliesStockGate) return false;

  const variants = product.variants ?? [];
  if (variants.length === 0) return product.stock <= 0;
  // Có variant: còn ít nhất 1 variant còn hàng thì sản phẩm vẫn mua được
  // (buyer chọn variant khác) — chỉ coi là hết hàng khi TẤT CẢ variant đều 0.
  return variants.every((v) => v.stock <= 0);
}
