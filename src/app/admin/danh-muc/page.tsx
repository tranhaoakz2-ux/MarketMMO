import { AdminPageHeader } from "@/components/admin/AdminUi";
import { requireAdminPage } from "@/lib/authz";
import AdminCategoriesPanel from "@/components/admin/AdminCategoriesPanel";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  return (
    <div>
      <AdminPageHeader
        title="Danh mục mới"
        sub="Duyệt danh mục do seller tự đề xuất khi đăng sản phẩm — danh mục PENDING đã dùng được ngay cho sản phẩm đang đăng, nhưng vẫn ẩn khỏi trang công khai cho tới khi duyệt."
      />
      <AdminCategoriesPanel />
    </div>
  );
}

export const metadata = { title: "Danh mục mới — Admin Control Center — MarketMMO" };
