import { requireAdminPage } from "@/lib/authz";
import AdminDisputesPanel from "@/components/admin/AdminDisputesPanel";

export const dynamic = "force-dynamic";

// PageHeader nằm bên trong AdminDisputesPanel (cùng cấu trúc bản demo).
export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireAdminPage();
  const { open } = await searchParams;
  return <AdminDisputesPanel openId={open} />;
}

export const metadata = { title: "Khiếu nại — Admin Control Center — MaketMMO" };
