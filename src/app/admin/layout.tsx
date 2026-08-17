import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";
import { getAdminSidebarCounts } from "@/lib/queries";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import AdminSidebar from "@/components/AdminSidebar";
import Reveal from "@/components/Reveal";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

// Kế thừa xuống mọi trang con /admin/** (xem ghi chú tương tự ở
// src/app/trang-ban-hang/layout.tsx) — khu vực quản trị tuyệt đối không được
// Google index.
export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

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
        {/* pl-16 dưới lg: chừa chỗ cho nút hamburger cố định (AdminSidebar) —
            từ lg trở lên sidebar tĩnh đã chiếm chỗ nên không cần chừa nữa.
            Đồng bộ cấu trúc responsive với bản demo (admin-demo/layout.tsx). */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface)]/95 py-2.5 pl-16 pr-4 backdrop-blur lg:h-[60px] lg:flex-nowrap lg:py-0 lg:pl-[22px] lg:pr-[22px]">
          <Link
            href="/"
            className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-[12px] font-bold text-[var(--adm-text)] transition hover:bg-[var(--adm-border)]"
          >
            ← Xem trang web
          </Link>
          <div className="flex items-center gap-2.5 lg:ml-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--adm-success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--adm-success)]">
              ● Hệ thống ổn định
            </span>
            {/* Cùng component/cơ chế lưu theme với buyer/seller (data-theme
                trên <html> + localStorage "theme") — admin dùng CHUNG, không
                tách riêng. Xem .admin-shell trong globals.css để biết cách
                bảng màu --adm-* tự đổi theo data-theme. */}
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 sm:px-7">
          <Reveal>{children}</Reveal>
        </div>
      </main>
    </div>
  );
}
