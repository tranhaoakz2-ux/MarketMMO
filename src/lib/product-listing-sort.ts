// Sắp xếp cho thanh tab "Mới nhất / Bán chạy / Giá ↑ / Giá ↓" trên trang
// danh sách sản phẩm (/danh-muc và /danh-muc/[slug]) — TÁCH RIÊNG khỏi
// src/lib/product-sort.ts (dùng cho dropdown "Sắp xếp" ở trang chủ,
// CategoryTabs.tsx) để không đổi hành vi/UI trang chủ khi thêm tuỳ chọn
// "Bán chạy" chỉ 2 trang này cần. Cùng nguyên tắc effective-price với
// product-sort.ts (không trùng lặp bừa — 2 trang khác nhau, options khác
// nhau, nên tách file thay vì nhồi thêm case vào 1 union type dùng chung).
export type ListingSortKey = "newest" | "bestselling" | "price_asc" | "price_desc";

export const LISTING_SORT_OPTIONS: { value: ListingSortKey; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "bestselling", label: "Bán chạy" },
  { value: "price_asc", label: "Giá ↑" },
  { value: "price_desc", label: "Giá ↓" },
];

export function parseListingSortKey(raw: string | undefined): ListingSortKey {
  return raw === "bestselling" || raw === "price_asc" || raw === "price_desc" ? raw : "newest";
}

// Sắp xếp "Giá ↑/↓" (giá HIỆU LỰC sau Mega Sale) giờ thực hiện Ở TẦNG QUERY
// (paginateProducts() trong src/lib/queries.ts, dùng computeEffectivePrice()
// từ src/lib/mega-sale.ts trực tiếp — không qua module này nữa) để phối hợp
// đúng với phân trang thật ở DB. effectiveListingPrice()/applyListingSort()
// (sắp trong bộ nhớ SAU khi đã tải toàn bộ) đã bị xoá cùng đợt refactor đó —
// xem PERFORMANCE_AUDIT.md mục 1.
