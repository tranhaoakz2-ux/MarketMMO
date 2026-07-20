import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminAuctionPanel from "@/components/admin/AdminAuctionPanel";

export const dynamic = "force-dynamic";

export default function AdminAuctionPage() {
  return (
    <div>
      <AdminPageHeader
        title="Đấu giá vị trí vàng"
        sub="Quản lý 6 vị trí carousel 'Sản phẩm nổi bật' trang chủ — sửa giá sàn, xem lịch sử đặt giá, gán thủ công hoặc đóng phiên sớm."
      />
      <AdminAuctionPanel />
    </div>
  );
}

export const metadata = { title: "Đấu giá vị trí vàng — Admin Control Center — MarketMMO" };
