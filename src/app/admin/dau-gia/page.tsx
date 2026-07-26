import { requireAdminPage } from "@/lib/authz";
import AdminAuctionPanel from "@/components/admin/AdminAuctionPanel";

export const dynamic = "force-dynamic";

// PageHeader nằm bên trong AdminAuctionPanel (cùng cấu trúc bản demo).
export default async function AdminAuctionPage() {
  await requireAdminPage();
  return <AdminAuctionPanel />;
}

export const metadata = { title: "Đấu giá vị trí vàng — Admin Control Center — MarketMMO" };
