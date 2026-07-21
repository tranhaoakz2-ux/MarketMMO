import SellerProductsPanel from "@/components/SellerProductsPanel";
import { getSellerVisibleCategories } from "@/lib/queries";

export default async function SellerProductsPage() {
  const categories = await getSellerVisibleCategories();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-foreground">Sản phẩm</h1>
        <p className="text-xs text-muted">
          Đăng sản phẩm mới (cần admin duyệt) hoặc thêm/xoá phiên bản (gói) cho
          sản phẩm của bạn — giá và kho riêng theo từng gói.
        </p>
      </div>
      <SellerProductsPanel categories={categories} />
    </div>
  );
}

export const metadata = { title: "Sản phẩm — Quản Lý Bán Hàng — MarketMMO" };
