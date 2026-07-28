import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminReviewsPanel from "@/components/admin/AdminReviewsPanel";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đánh giá"
        subtitle="Xem và ẩn đánh giá spam/xúc phạm của người mua dành cho gian hàng — không xoá cứng, chỉ ẩn khỏi trang công khai."
      />
      <AdminReviewsPanel />
    </div>
  );
}

export const metadata = { title: "Đánh giá — Admin Control Center — MarketMMO" };
