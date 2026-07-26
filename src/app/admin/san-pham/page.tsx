import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminProductsPanel from "@/components/admin/AdminProductsPanel";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sản phẩm chờ duyệt"
        subtitle="Duyệt sản phẩm mới seller tự đăng — chỉ hiện công khai trên site sau khi được duyệt."
      />
      <AdminProductsPanel />
    </div>
  );
}

export const metadata = { title: "Sản phẩm chờ duyệt — Admin Control Center — MarketMMO" };
