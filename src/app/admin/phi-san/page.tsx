import { requireAdminPage } from "@/lib/authz";
import AdminPlatformFeePanel from "@/components/admin/AdminPlatformFeePanel";

export const dynamic = "force-dynamic";

// PageHeader nằm bên trong AdminPlatformFeePanel (cùng cấu trúc bản demo).
export default async function AdminPlatformFeePage() {
  await requireAdminPage();
  return <AdminPlatformFeePanel />;
}

export const metadata = { title: "Phí sàn — Admin Control Center — MaketMMO" };
