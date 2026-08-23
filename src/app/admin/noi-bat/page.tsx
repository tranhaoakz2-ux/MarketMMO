import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import AdminFeaturedPanel from "@/components/admin/AdminFeaturedPanel";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nổi bật trang chủ"
        subtitle="Sắp xếp thứ tự sản phẩm/seller đang được ghim vào khu 'Sản phẩm nổi bật' và 'Các Seller Nổi Bật' ở trang chủ. Ghim/bỏ ghim mục mới ở trang quản lý Sản phẩm và Người bán."
      />
      <AdminFeaturedPanel />
    </div>
  );
}

export const metadata = { title: "Nổi bật trang chủ — Admin Control Center — MaketMMO" };
