import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminVerificationsPanel from "@/components/admin/AdminVerificationsPanel";

export const dynamic = "force-dynamic";

export default function AdminVerificationsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Xác thực CCCD"
        sub="Duyệt yêu cầu xác thực CCCD của người bán — duyệt sẽ bật badge 'Đã xác thực' công khai trên gian hàng."
      />
      <AdminVerificationsPanel />
    </div>
  );
}

export const metadata = { title: "Xác thực CCCD — Admin Control Center — MarketMMO" };
