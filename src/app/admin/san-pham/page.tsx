import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminProductsPanel from "@/components/admin/AdminProductsPanel";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Sản phẩm chờ duyệt"
        sub="Duyệt sản phẩm mới seller tự đăng — chỉ hiện công khai trên site sau khi được duyệt."
      />
      <AdminProductsPanel />
    </div>
  );
}

export const metadata = { title: "Sản phẩm chờ duyệt — Admin Control Center — MarketMMO" };
