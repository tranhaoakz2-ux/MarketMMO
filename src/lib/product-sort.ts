import type { Product } from "@/data/products";

// Sắp xếp cho dropdown "Sắp xếp" ở trang chủ (CategoryTabs.tsx) — KHÁC
// ShopProductList.tsx (seller shop, sort "Phổ biến/Mới nhất/Bán chạy" hoàn
// toàn ở client bằng useMemo trên mảng đã có sẵn) vì trang chủ phân trang
// SERVER-SIDE (chỉ 1 trang ~36 sản phẩm được gửi xuống client mỗi lần) —
// sắp xếp phải làm TRƯỚC khi cắt trang, nên nằm ở đây (dùng chung giữa
// Server Component src/app/page.tsx và client CategoryTabs.tsx) thay vì làm
// trong 1 component client nhận toàn bộ mảng.
export type ProductSortKey = "newest" | "price_asc" | "price_desc";

export const PRODUCT_SORT_OPTIONS: { value: ProductSortKey | "default"; label: string }[] = [
  { value: "default", label: "Mặc định" },
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp" },
  { value: "price_desc", label: "Giá cao" },
];

export function parseProductSortKey(raw: string | undefined): ProductSortKey | undefined {
  return raw === "newest" || raw === "price_asc" || raw === "price_desc" ? raw : undefined;
}

// Giá dùng để so sánh khi sắp "Giá thấp"/"Giá cao" — lấy ĐÚNG con số nổi bật
// hiển thị trên thẻ sản phẩm (xem ProductCard.tsx/CategoryProductCard.tsx):
// giá sale Mega Sale nếu đang active, không thì product.price niêm yết. Với
// sản phẩm có khoảng giá (priceMax), product.price là ĐẦU THẤP của khoảng —
// nhất quán với cách hiện "9.000đ - 12.000đ" trên thẻ (không dùng giá riêng
// từng variant, không dùng priceMax).
function effectiveSortPrice(p: Product): number {
  return p.megaSale?.active ? p.megaSale.salePrice : p.price;
}

// "default" (hoặc không truyền) = giữ NGUYÊN thứ tự đầu vào, không sắp gì
// thêm — getAllProducts() đã orderBy createdAt desc ở tầng DB nên "Mặc định"
// hiện tại trùng "Mới nhất", đúng như mô tả yêu cầu ban đầu.
export function sortProducts(products: Product[], sort: ProductSortKey | undefined): Product[] {
  if (!sort) return products;
  const copy = [...products];
  if (sort === "newest") {
    return copy.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }
  if (sort === "price_asc") {
    return copy.sort((a, b) => effectiveSortPrice(a) - effectiveSortPrice(b));
  }
  return copy.sort((a, b) => effectiveSortPrice(b) - effectiveSortPrice(a));
}
