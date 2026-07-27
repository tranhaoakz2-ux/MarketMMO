"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import ProductCard from "@/components/ProductCard";

type SortKey = "popular" | "newest" | "bestselling";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Phổ Biến" },
  { key: "newest", label: "Mới Nhất" },
  { key: "bestselling", label: "Bán Chạy" },
];

// Sắp xếp thuần phía client — toàn bộ sản phẩm của gian hàng đã tải sẵn 1
// lần (shop.products, không phân trang), nên không cần gọi lại query nào.
function sortProducts(products: Product[], sortBy: SortKey): Product[] {
  const sorted = [...products];
  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    case "bestselling":
      return sorted.sort((a, b) => b.sold - a.sold);
    case "popular":
    default:
      return sorted.sort((a, b) => b.views - a.views);
  }
}

// Nút lọc "Phổ Biến/Mới Nhất/Bán Chạy" + lưới sản phẩm gian hàng seller
// (/shop/[seller]) — gộp chung 1 component client vì cần chia sẻ state
// sắp xếp giữa nút bấm và lưới hiển thị (trang cha là Server Component nên
// không tự giữ state được).
export default function ShopProductList({ products }: { products: Product[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("popular");
  const sorted = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);

  return (
    <>
      <div className="my-4 flex flex-wrap gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              sortBy === option.key
                ? "bg-ink text-white"
                : "bg-surface text-foreground ring-1 ring-border-c hover:bg-surface-alt"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
          Gian hàng chưa có sản phẩm.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
