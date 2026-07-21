import { AdminPageHeader } from "@/components/admin/AdminUi";
import { requireAdminPage } from "@/lib/authz";
import AdminDepositsPanel from "@/components/admin/AdminDepositsPanel";

export const dynamic = "force-dynamic";

export default async function AdminDepositsPage() {
  await requireAdminPage();
  return (
    <div>
      <AdminPageHeader
        title="Nạp tiền"
        sub="Duyệt/từ chối yêu cầu nạp tiền thủ công (chuyển khoản ngân hàng / USDT). Tự động hoá qua VNPay sẽ thay thế luồng này khi tích hợp thanh toán tự động — hiện vẫn cần admin xác nhận thủ công."
      />
      <AdminDepositsPanel />
    </div>
  );
}

export const metadata = { title: "Nạp tiền — Admin Control Center — MarketMMO" };
