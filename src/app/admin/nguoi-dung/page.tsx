import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div>
      <AdminPageHeader
        title="Người dùng"
        sub="Tìm kiếm và quản lý toàn bộ tài khoản trên nền tảng. Khoá tài khoản chặn đăng nhập và mọi thao tác cần xác thực (mua hàng, chat, đăng bài...)."
      />
      <AdminUsersPanel />
    </div>
  );
}

export const metadata = { title: "Người dùng — Admin Control Center — MarketMMO" };
