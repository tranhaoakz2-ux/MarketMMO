import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminForumReportsPanel from "@/components/admin/AdminForumReportsPanel";

export const dynamic = "force-dynamic";

export default function AdminForumReportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Diễn đàn"
        sub="Xử lý báo cáo bài viết/bình luận vi phạm do người dùng gửi — ẩn nội dung khỏi diễn đàn công khai hoặc bỏ qua nếu không vi phạm."
      />
      <AdminForumReportsPanel />
    </div>
  );
}

export const metadata = { title: "Diễn đàn — Admin Control Center — MarketMMO" };
