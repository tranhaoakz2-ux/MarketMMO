"use client";

import { PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { Button, PageHeader } from "@/components/seller-demo/DemoKit";
import AddProductForm from "@/components/AddProductForm";
import ProductVariantManager from "@/components/ProductVariantManager";

type Category = { id: string; slug: string; name: string; emoji: string };

export default function SellerProductsPanel({ categories }: { categories: Category[] }) {
  // Đổi key để buộc ProductVariantManager unmount/remount (tự fetch lại danh
  // sách) ngay sau khi đăng sản phẩm mới thành công — 2 component độc lập,
  // không chia sẻ state nào khác ngoài "cần load lại".
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sản phẩm"
        subtitle="Đăng sản phẩm mới (cần admin duyệt), quản lý phiên bản & kho dữ liệu giao hàng."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            {showForm ? "Đóng biểu mẫu" : "Đăng sản phẩm mới"}
          </Button>
        }
      />
      {showForm && (
        <AddProductForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
      <ProductVariantManager key={refreshKey} />
    </div>
  );
}
