import { PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { requireAdminPage } from "@/lib/authz";
import AdminHomeBannerPanel from "@/components/admin/AdminHomeBannerPanel";
import AdminSiteContentPanel from "@/components/admin/AdminSiteContentPanel";

export const dynamic = "force-dynamic";

export default async function AdminSiteContentPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nội dung trang web"
        subtitle="Banner trang chủ, thông báo chạy đầu trang, tag tìm kiếm phổ biến, liên hệ footer và mức quỹ bảo hiểm gợi ý — sửa trực tiếp, không cần deploy."
      />
      <AdminHomeBannerPanel />
      <AdminSiteContentPanel />
    </div>
  );
}

export const metadata = { title: "Nội dung trang web — Admin Control Center — MaketMMO" };
