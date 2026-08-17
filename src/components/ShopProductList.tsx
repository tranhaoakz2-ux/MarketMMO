import Link from "next/link";
import type { Product } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export type ShopSortKey = "popular" | "newest" | "bestselling";

const sortOptions: { key: ShopSortKey; label: string }[] = [
  { key: "popular", label: "Phổ Biến" },
  { key: "newest", label: "Mới Nhất" },
  { key: "bestselling", label: "Bán Chạy" },
];

// Nút lọc "Phổ Biến/Mới Nhất/Bán Chạy" + lưới sản phẩm gian hàng seller
// (/shop/[seller]) — TRƯỚC ĐÂY là component "use client" tự sắp xếp bằng JS
// trên TOÀN BỘ sản phẩm đã tải sẵn 1 lần (không phân trang, xem
// PERFORMANCE_AUDIT.md mục 1). Trang cha giờ đã phân trang + sắp xếp THẬT ở
// DB (getSellerProductsPaged()) nên component này chỉ còn hiển thị + đổi
// sort qua Link (cùng cơ chế /danh-muc đang dùng) — không cần "use client"/
// state nữa.
export default function ShopProductList({
  products,
  sellerSlug,
  sortBy,
}: {
  products: Product[];
  sellerSlug: string;
  sortBy: ShopSortKey;
}) {
  return (
    <>
      <div className="my-4 flex flex-wrap gap-2">
        {sortOptions.map((option) => (
          <Link
            key={option.key}
            href={option.key === "popular" ? `/shop/${sellerSlug}` : `/shop/${sellerSlug}?sort=${option.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              sortBy === option.key
                ? "bg-ink text-white"
                : "bg-surface text-foreground ring-1 ring-border-c hover:bg-surface-alt"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
          Gian hàng chưa có sản phẩm.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
