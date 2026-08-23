import { requireAdminPage } from "@/lib/authz";
import AdminCommissionsPanel from "@/components/admin/AdminCommissionsPanel";

export const dynamic = "force-dynamic";

// PageHeader nằm bên trong AdminCommissionsPanel (cùng cấu trúc với bản demo
// AdminDemoCommissions.tsx, vì tiêu đề cần đứng trên cả segmented 2 tab).
export default async function AdminCommissionsPage() {
  await requireAdminPage();
  return <AdminCommissionsPanel />;
}

export const metadata = { title: "Hoa hồng — Admin Control Center — MaketMMO" };
