import { AdminPageHeader } from "@/components/admin/AdminUi";
import { requireAdminPage } from "@/lib/authz";
import AdminDisputesPanel from "@/components/admin/AdminDisputesPanel";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireAdminPage();
  const { open } = await searchParams;
  return (
    <div>
      <AdminPageHeader
        title="Khiếu nại"
        sub="Buyer hoặc seller mở khiếu nại trên đơn hàng đang ký quỹ — bấm vào 1 dòng để xem chi tiết và quyết định."
      />
      <AdminDisputesPanel openId={open} />
    </div>
  );
}

export const metadata = { title: "Khiếu nại — Admin Control Center — MarketMMO" };
