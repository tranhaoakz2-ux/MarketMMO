import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";

export const dynamic = "force-dynamic";

export default function AdminWithdrawalsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Rút tiền"
        sub="Duyệt/từ chối yêu cầu rút tiền của người bán. Tiền đã bị khoá khỏi ví ngay khi seller tạo yêu cầu — Duyệt chỉ đánh dấu đã chuyển khoản, Từ chối hoàn lại đúng số tiền đã khoá."
      />
      <AdminWithdrawalsPanel />
    </div>
  );
}

export const metadata = { title: "Rút tiền — Admin Control Center — MarketMMO" };
