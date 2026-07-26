import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rút tiền"
        subtitle="Duyệt/từ chối yêu cầu rút tiền của người bán. Tiền đã bị khoá khỏi ví ngay khi seller tạo yêu cầu — Duyệt chỉ đánh dấu đã chuyển khoản, Từ chối hoàn lại đúng số tiền đã khoá."
      />
      <AdminWithdrawalsPanel />
    </div>
  );
}

export const metadata = { title: "Rút tiền — Admin Control Center — MarketMMO" };
