import { AdminPageHeader } from "@/components/admin/AdminUi";
import { requireAdminPage } from "@/lib/authz";
import AdminPlatformFeePanel from "@/components/admin/AdminPlatformFeePanel";

export const dynamic = "force-dynamic";

export default async function AdminPlatformFeePage() {
  await requireAdminPage();
  return (
    <div>
      <AdminPageHeader
        title="Phí sàn"
        sub="Phí % chung áp trên MỌI đơn hàng của mọi seller (tính trên giá sau giảm giá, freeze lúc đặt đơn). Chỉnh % mặc định, đặt lịch phí theo kỳ, xem tổng phí thu được."
      />
      <AdminPlatformFeePanel />
    </div>
  );
}

export const metadata = { title: "Phí sàn — Admin Control Center — MarketMMO" };
