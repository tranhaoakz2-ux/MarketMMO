"use client";

// Sidebar THẬT của Admin Control Center — thiết kế đồng bộ với bản demo đã
// duyệt (src/components/admin-demo/DemoAdminSidebar.tsx): icon lucide-react
// thay emoji, active state = thanh accent trái mảnh + nền dim (không nền
// vàng đặc), badge số việc chờ tinh gọn, và THÊM drawer trượt cho mobile
// (bản cũ sidebar 258px cố định không có fallback mobile, vỡ layout dưới
// lg — lỗi đã phát hiện và sửa khi làm bản demo, nay áp dụng luôn cho bản
// thật). Giữ NGUYÊN props/hrefs/dữ liệu thật — chỉ đổi phần trình bày.
import { useState } from "react";
import {
  Coins,
  Contact,
  Gavel,
  Gift,
  LayoutGrid,
  Library,
  Lock,
  Menu,
  PackageSearch,
  Scale,
  Scroll,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; icon: typeof LayoutGrid; label: string; count?: number };
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
    eligibleCommissions: number;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moderationTotal = counts.pendingProducts + counts.pendingCategories + counts.pendingForumReports;

  const groups: NavGroup[] = [
    { label: "Tổng quan", items: [{ href: "/admin", icon: LayoutGrid, label: "Tổng quan" }] },
    {
      label: "Vận hành",
      items: [
        { href: "/admin/nguoi-dung", icon: Users, label: "Người dùng" },
        { href: "/admin/nguoi-ban", icon: Store, label: "Người bán" },
        { href: "/admin/don-hang", icon: ShoppingBag, label: "Đơn hàng & Ký quỹ" },
      ],
    },
    {
      label: "Kiểm duyệt",
      groupCount: moderationTotal,
      items: [
        { href: "/admin/san-pham", icon: PackageSearch, label: "Sản phẩm", count: counts.pendingProducts },
        { href: "/admin/danh-muc", icon: Tags, label: "Danh mục mới", count: counts.pendingCategories },
        { href: "/admin/dien-dan", icon: Library, label: "Diễn đàn", count: counts.pendingForumReports },
      ],
    },
    {
      label: "Tài chính",
      items: [
        { href: "/admin/nap-tien", icon: Coins, label: "Nạp tiền", count: counts.pendingDeposits },
        { href: "/admin/rut-tien", icon: Coins, label: "Rút tiền", count: counts.pendingWithdrawals },
        { href: "/admin/hoa-hong", icon: Gift, label: "Hoa hồng", count: counts.eligibleCommissions },
        { href: "/admin/phi-san", icon: Contact, label: "Phí sàn" },
        { href: "/admin/tai-chinh", icon: Library, label: "Sức khoẻ tài chính" },
      ],
    },
    {
      label: "Giải quyết",
      items: [
        { href: "/admin/khieu-nai", icon: Scale, label: "Khiếu nại", count: counts.openDisputes },
        { href: "/admin/dau-gia", icon: Gavel, label: "Đấu giá vị trí vàng" },
      ],
    },
    {
      label: "Hệ thống",
      items: [
        { href: "/admin/nhat-ky", icon: Scroll, label: "Nhật ký hoạt động" },
        { href: "/admin/cai-dat", icon: Settings, label: "Cài đặt hệ thống" },
      ],
    },
  ];

  const navBody = (
    <>
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-[18px] pb-3.5 pt-[18px]">
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[var(--adm-brand)] to-[var(--adm-brand-dark)] text-[15px] font-black text-[#14141f]">
          MM
        </div>
        <div className="min-w-0 flex-1 leading-[1.15]">
          <div className="text-[13.5px] font-black tracking-wide">MARKETMMO</div>
          <div className="truncate text-[10px] uppercase tracking-widest text-[var(--adm-muted)]">
            Admin Control Center
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--adm-muted)] hover:bg-white/10 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-3.5 text-[10.5px] font-extrabold uppercase tracking-widest text-white/30">
              {group.label}
              {group.groupCount !== undefined && group.groupCount > 0 && (
                <span className="rounded-full bg-[var(--adm-warn-bg)] px-1.5 py-px text-[10px] font-extrabold tabular-nums text-[var(--adm-warn)]">
                  {group.groupCount}
                </span>
              )}
            </div>
            {group.items.map((item) => {
              const active =
                item.href === "/admin" ? pathname === item.href : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`relative mb-0.5 flex items-center gap-2.5 rounded-[9px] py-[8.5px] pl-3 pr-2.5 text-[13px] font-semibold transition ${
                    active
                      ? "bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
                      : "text-[var(--adm-muted)] hover:bg-white/[0.05] hover:text-[var(--adm-text)]"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--adm-brand)]" />
                  )}
                  <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={2.1} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-extrabold tabular-nums ${
                        active ? "bg-[var(--adm-brand)] text-[#14141f]" : "bg-white/10 text-[var(--adm-text)]"
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-extrabold text-[var(--adm-text)]">{adminEmail}</p>
          <p className="flex items-center gap-1 text-[10.5px] text-[var(--adm-muted)]">
            <Lock className="h-2.5 w-2.5" /> Quản trị viên
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Nút hamburger — chỉ hiện dưới lg, cố định góc trên-trái */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở menu quản trị"
        className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] text-[var(--adm-text)] shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar tĩnh — desktop (lg trở lên) */}
      <div className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-[var(--adm-border)] bg-[var(--adm-sidebar)] text-[var(--adm-text)] lg:flex">
        {navBody}
      </div>

      {/* Drawer — mobile/tablet, ẩn mặc định */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[258px] max-w-[82vw] flex-col border-r border-[var(--adm-border)] bg-[var(--adm-sidebar)] text-[var(--adm-text)] shadow-2xl">
            {navBody}
          </div>
        </div>
      )}
    </>
  );
}
