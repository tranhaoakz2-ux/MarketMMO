import { PageHeader, SectionTitle } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminAllProductsPanel from "@/components/admin/AdminAllProductsPanel";
import AdminProductsPanel from "@/components/admin/AdminProductsPanel";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Sản phẩm"
        subtitle="Duyệt sản phẩm mới seller tự đăng, và quản lý (sửa/ẩn/xoá) toàn bộ sản phẩm đang sống trên sàn."
      />

      <div>
        <SectionTitle>Tất cả sản phẩm</SectionTitle>
        <AdminAllProductsPanel />
      </div>

      <div>
        <SectionTitle>Sản phẩm chờ duyệt</SectionTitle>
        <AdminProductsPanel />
      </div>
    </div>
  );
}

export const metadata = { title: "Sản phẩm — Admin Control Center — MarketMMO" };
