import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminCategoriesPanel from "@/components/admin/AdminCategoriesPanel";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Danh mục mới"
        subtitle="Duyệt danh mục do seller tự đề xuất khi đăng sản phẩm — danh mục PENDING đã dùng được ngay cho sản phẩm đang đăng, nhưng vẫn ẩn khỏi trang công khai cho tới khi duyệt."
      />
      <AdminCategoriesPanel />
    </div>
  );
}

export const metadata = { title: "Danh mục mới — Admin Control Center — MarketMMO" };
