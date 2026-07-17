"use client";

import { useState } from "react";
import AddProductForm from "@/components/AddProductForm";
import ProductVariantManager from "@/components/ProductVariantManager";

type Category = { id: string; slug: string; name: string; emoji: string };

export default function SellerProductsPanel({ categories }: { categories: Category[] }) {
  // Đổi key để buộc ProductVariantManager unmount/remount (tự fetch lại danh
  // sách) ngay sau khi đăng sản phẩm mới thành công — 2 component độc lập,
  // không chia sẻ state nào khác ngoài "cần load lại".
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <AddProductForm categories={categories} onCreated={() => setRefreshKey((k) => k + 1)} />
      <ProductVariantManager key={refreshKey} />
    </div>
  );
}
