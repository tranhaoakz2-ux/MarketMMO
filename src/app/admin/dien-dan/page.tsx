import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminForumReportsPanel from "@/components/admin/AdminForumReportsPanel";

export const dynamic = "force-dynamic";

export default async function AdminForumReportsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Diễn đàn"
        subtitle="Xử lý báo cáo bài viết/bình luận vi phạm do người dùng gửi — ẩn nội dung khỏi diễn đàn công khai hoặc bỏ qua nếu không vi phạm."
      />
      <AdminForumReportsPanel />
    </div>
  );
}

export const metadata = { title: "Diễn đàn — Admin Control Center — MaketMMO" };
