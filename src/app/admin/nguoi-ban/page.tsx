import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminSellersPanel from "@/components/admin/AdminSellersPanel";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Người bán"
        subtitle="Quản lý toàn bộ gian hàng. Khoá gian hàng ẩn mọi sản phẩm khỏi site công khai — seller vẫn đăng nhập được để xem lý do."
      />
      <AdminSellersPanel />
    </div>
  );
}

export const metadata = { title: "Người bán — Admin Control Center — MarketMMO" };
