import { requireAdminPage } from "@/lib/authz";
import AdminSellerLevelPanel from "@/components/admin/AdminSellerLevelPanel";

export const dynamic = "force-dynamic";

// PageHeader nằm bên trong AdminSellerLevelPanel (cùng cấu trúc bản demo).
export default async function AdminSellerLevelPage() {
  await requireAdminPage();
  return <AdminSellerLevelPanel />;
}

export const metadata = { title: "Hạng người bán — Admin Control Center — MaketMMO" };
