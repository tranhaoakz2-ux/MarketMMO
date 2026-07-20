import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminSellersPanel from "@/components/admin/AdminSellersPanel";

export const dynamic = "force-dynamic";

export default function AdminSellersPage() {
  return (
    <div>
      <AdminPageHeader
        title="Người bán"
        sub="Quản lý toàn bộ gian hàng. Khoá gian hàng ẩn mọi sản phẩm khỏi site công khai — seller vẫn đăng nhập được để xem lý do."
      />
      <AdminSellersPanel />
    </div>
  );
}

export const metadata = { title: "Người bán — Admin Control Center — MarketMMO" };
