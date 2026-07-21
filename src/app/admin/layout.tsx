import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";
import { getAdminSidebarCounts } from "@/lib/queries";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

// Admin Control Center — shell RIÊNG BIỆT, không dùng Header/Footer của site
// mua sắm (khác hẳn layout /trang-ban-hang vốn lồng trong chrome storefront)
// — cố tình tách hẳn để "khu vực quản trị" có cảm giác khác biệt rõ ràng,
// đúng bản demo Artifact đã được duyệt trước khi build.
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Guard tầng layout (lớp 1). Mỗi page.tsx con GỌI LẠI requireAdminPage() (lớp
  // 2, phòng thủ nhiều lớp) — getAuthSession() bọc React.cache nên cả 2 chung 1
  // query session trong cùng request, không tốn thêm.
  const session = await requireAdminPage();

  const counts = await getAdminSidebarCounts();

  return (
    <div className="admin-shell flex">
      <AdminSidebar adminEmail={session.user.email ?? "admin"} counts={counts} />
      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 flex h-[60px] items-center gap-3 border-b border-[var(--adm-border)] bg-[var(--adm-surface)] px-[22px]">
          <Link
            href="/"
            className="rounded-[9px] border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-[12px] font-bold text-[var(--adm-text)] hover:bg-[var(--adm-border)]"
          >
            ← Xem trang web
          </Link>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--adm-success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--adm-success)]">
            ● Hệ thống ổn định
          </span>
        </div>
        <div className="mx-auto max-w-[1320px] px-7 pb-16 pt-6">{children}</div>
      </main>
    </div>
  );
}
