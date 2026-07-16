import ProductVariantManager from "@/components/ProductVariantManager";

export default function SellerProductsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-ink">Sản phẩm</h1>
        <p className="text-xs text-muted">
          Thêm/xoá biến thể (gói) cho sản phẩm của bạn — giá và kho riêng theo từng gói.
        </p>
      </div>
      <ProductVariantManager />
    </div>
  );
}

export const metadata = { title: "Sản phẩm — Quản Lý Bán Hàng — MarketMMO" };
