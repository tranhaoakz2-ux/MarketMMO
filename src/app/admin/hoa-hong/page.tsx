import { AdminPageHeader } from "@/components/admin/AdminUi";
import { requireAdminPage } from "@/lib/authz";
import AdminCommissionsPanel from "@/components/admin/AdminCommissionsPanel";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  await requireAdminPage();
  return (
    <div>
      <AdminPageHeader
        title="Hoa hồng affiliate"
        sub="Quản lý hoa hồng giới thiệu: theo dõi theo trạng thái, chỉnh % (có ràng buộc ngưỡng margin), và giải ngân phần đủ điều kiện."
      />
      <AdminCommissionsPanel />
    </div>
  );
}

export const metadata = { title: "Hoa hồng — Admin Control Center — MarketMMO" };
