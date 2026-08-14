import type { Product } from "@/data/products";

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

// Giá dùng để so sánh khi sắp "Giá ↑"/"Giá ↓" — lấy ĐÚNG con số nổi bật hiển
// thị trên thẻ sản phẩm (xem ProductCard.tsx/CategoryProductCard.tsx): giá
// sale Mega Sale nếu đang active, không thì product.price niêm yết. Sản
// phẩm có khoảng giá (priceMax) thì product.price là ĐẦU THẤP của khoảng —
// nhất quán với cách hiện "9.000đ - 12.000đ" trên thẻ (không dùng giá riêng
// từng variant, không dùng priceMax) — cùng quy ước với product-sort.ts.
export function effectiveListingPrice(p: Product): number {
  return p.megaSale?.active ? p.megaSale.salePrice : p.price;
}

// "newest"/"bestselling" ĐÃ được sắp đúng ở tầng DB (orderBy trong
// getAllProducts()/getProductsByCategory(), xem src/lib/queries.ts) —
// KHÔNG cần sắp lại ở đây. Chỉ "price_asc"/"price_desc" cần sắp ở JS vì giá
// hiển thị thực tế (mega sale) là giá trị TÍNH RA sau khi map, không phải 1
// cột thô trong DB — làm ở đây, TRƯỚC khi trang cắt phân trang, để phân
// trang vẫn đúng dù sắp xếp theo tiêu chí nào.
export function applyListingSort(products: Product[], sort: ListingSortKey): Product[] {
  if (sort !== "price_asc" && sort !== "price_desc") return products;
  const copy = [...products].sort((a, b) => effectiveListingPrice(a) - effectiveListingPrice(b));
  return sort === "price_desc" ? copy.reverse() : copy;
}
