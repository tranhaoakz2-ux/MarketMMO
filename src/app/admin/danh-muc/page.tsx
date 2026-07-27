import { PageHeader, SectionTitle } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminCategoriesPanel from "@/components/admin/AdminCategoriesPanel";
import AdminCategoryTreePanel from "@/components/admin/AdminCategoryTreePanel";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Danh mục"
        subtitle="Quản lý cây danh mục (nhóm cha/danh mục con) và duyệt danh mục do seller tự đề xuất."
      />

      <div>
        <SectionTitle>Cây danh mục</SectionTitle>
        <AdminCategoryTreePanel />
      </div>

      <div>
        <SectionTitle>Danh mục seller đề xuất</SectionTitle>
        <AdminCategoriesPanel />
      </div>
    </div>
  );
}

export const metadata = { title: "Danh mục mới — Admin Control Center — MarketMMO" };
