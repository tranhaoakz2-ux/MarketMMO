import SellerProductsPanel from "@/components/SellerProductsPanel";
import { getSellerVisibleCategories } from "@/lib/queries";

export default async function SellerProductsPage() {
  const categories = await getSellerVisibleCategories();

  return <SellerProductsPanel categories={categories} />;
}

export const metadata = { title: "Sản Phẩm — Quản Lý Bán Hàng — MaketMMO" };
