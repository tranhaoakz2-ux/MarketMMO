"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; icon: string; label: string; count?: number };
type NavGroup = { label: string; items: NavItem[]; groupCount?: number };

export default function AdminSidebar({
  adminEmail,
  counts,
}: {
  adminEmail: string;
  counts: {
    pendingProducts: number;
    pendingCategories: number;
    pendingForumReports: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    openDisputes: number;
  };
}) {
  const pathname = usePathname();
  const moderationTotal =
    counts.pendingProducts + counts.pendingCategories + counts.pendingForumReports;

  const groups: NavGroup[] = [
    { label: "Tổng quan", items: [{ href: "/admin", icon: "🏠", label: "Tổng quan" }] },
    {
      label: "Vận hành",
      items: [
        { href: "/admin/nguoi-dung", icon: "👤", label: "Người dùng" },
        { href: "/admin/nguoi-ban", icon: "🏪", label: "Người bán" },
        { href: "/admin/don-hang", icon: "📦", label: "Đơn hàng & Ký quỹ" },
      ],
    },
    {
      label: "Kiểm duyệt",
      groupCount: moderationTotal,
      items: [
        { href: "/admin/san-pham", icon: "🗂️", label: "Sản phẩm chờ duyệt", count: counts.pendingProducts },
        { href: "/admin/danh-muc", icon: "🏷️", label: "Danh mục mới", count: counts.pendingCategories },
        { href: "/admin/dien-dan", icon: "💬", label: "Diễn đàn", count: counts.pendingForumReports },
      ],
    },
    {
      label: "Tài chính",
      items: [
        { href: "/admin/nap-tien", icon: "⬇️", label: "Nạp tiền", count: counts.pendingDeposits },
        { href: "/admin/rut-tien", icon: "⬆️", label: "Rút tiền", count: counts.pendingWithdrawals },
        { href: "/admin/tai-chinh", icon: "📊", label: "Sức khoẻ tài chính" },
      ],
    },
    {
      label: "Giải quyết",
      items: [
        { href: "/admin/khieu-nai", icon: "⚠️", label: "Khiếu nại", count: counts.openDisputes },
        { href: "/admin/dau-gia", icon: "🏆", label: "Đấu giá vị trí vàng" },
      ],
    },
    {
      label: "Hệ thống",
      items: [
        { href: "/admin/nhat-ky", icon: "📜", label: "Nhật ký hoạt động" },
        { href: "/admin/cai-dat", icon: "⚙️", label: "Cài đặt hệ thống" },
      ],
    },
  ];

  return (
    <div
      className="flex h-screen w-[258px] shrink-0 flex-col border-r border-[var(--adm-border)] bg-[var(--adm-sidebar)] text-[#f2f2f6] sticky top-0"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-[18px] pb-3.5 pt-[18px]">
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[var(--adm-brand)] to-[var(--adm-brand-dark)] text-[15px] font-black text-[#14141f]">
          MM
        </div>
        <div className="leading-[1.15]">
          <div className="text-[13.5px] font-black tracking-wide">MARKETMMO</div>
          <div className="text-[10px] uppercase tracking-widest text-[#8f8fa3]">Admin Control Center</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-3.5 text-[10.5px] font-extrabold uppercase tracking-widest text-[#5f5f6e]">
              {group.label}
              {group.groupCount !== undefined && group.groupCount > 0 && (
                <span className="rounded-full bg-[var(--adm-warn-bg)] px-1.5 py-px text-[10px] font-extrabold text-[var(--adm-warn)]">
                  {group.groupCount}
                </span>
              )}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-[9px] px-2.5 py-[8.5px] text-[13px] font-semibold transition ${
                    active
                      ? "bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
                      : "text-[#c4c4d1] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={`w-[18px] shrink-0 text-center text-[14.5px] ${active ? "" : "opacity-75 grayscale"}`}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-extrabold ${
                        active ? "bg-[var(--adm-brand)] text-[#14141f]" : "bg-white/10 text-[#d4d4dc]"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-white/[0.06] p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--adm-brand)] text-[13px] font-black text-[#14141f]">
          {adminEmail.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-extrabold text-white">{adminEmail}</p>
          <p className="text-[10.5px] text-[#8f8fa3]">Quản trị viên</p>
        </div>
      </div>
    </div>
  );
}
