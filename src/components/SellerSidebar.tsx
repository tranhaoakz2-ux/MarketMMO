"use client";

import {
  AlertTriangle,
  Clock,
  Gavel,
  LayoutGrid,
  Package,
  PackageCheck,
  Send,
  Server,
  ShieldCheck,
  Star,
  Tag,
  UserCircle,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SellerAvatar from "@/components/SellerAvatar";
import { formatVnd } from "@/lib/format";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
};

const navItems: NavItem[] = [
  { label: "Tổng Quan", href: "/trang-ban-hang", icon: LayoutGrid },
  { label: "Hồ Sơ Cá Nhân", href: "/trang-ban-hang/ho-so", icon: UserCircle },
  { label: "Sản Phẩm", href: "/trang-ban-hang/san-pham", icon: Package },
  { label: "Đơn Sản Phẩm", href: "/trang-ban-hang/don-san-pham", icon: PackageCheck },
  { label: "Đơn Dịch Vụ", href: "/trang-ban-hang/don-dich-vu", icon: Wrench },
  { label: "Đặt Trước", href: "/trang-ban-hang/dat-truoc", icon: Clock },
  { label: "Máy Chủ (VPS)", href: "/trang-ban-hang/may-chu", icon: Server },
  { label: "Mã Giảm Giá", href: "/trang-ban-hang/ma-giam-gia", icon: Tag },
  { label: "Rút Tiền", href: "/trang-ban-hang/rut-tien", icon: Wallet },
  { label: "Quảng Bá (Đấu Giá)", href: "/trang-ban-hang/quang-ba", icon: Gavel },
  { label: "Khiếu Nại", href: "/trang-ban-hang/khieu-nai", icon: AlertTriangle },
  { label: "Quỹ Bảo Hiểm", href: "/trang-ban-hang/quy-bao-hiem", icon: ShieldCheck },
  { label: "Đánh Giá", href: "/trang-ban-hang/danh-gia", icon: Star },
  { label: "Telegram Bot", href: "/trang-ban-hang/telegram-bot", icon: Send },
];

export default function SellerSidebar({
  shopName,
  avatarUrl,
  verified,
  insuranceBalance,
  insuranceFundTarget,
  outOfStockCount,
}: {
  shopName: string;
  avatarUrl?: string | null;
  verified: boolean;
  insuranceBalance: number;
  insuranceFundTarget: number;
  // Số sản phẩm ĐÃ DUYỆT đang hết hàng (isOutOfStock(), xem
  // getSellerOutOfStockCount() trong src/lib/queries.ts) — hiện badge cạnh
  // "Sản Phẩm" khi >0, tự biến mất khi seller bơm kho lại (tính live, không
  // cache).
  outOfStockCount: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/trang-ban-hang" ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="lg:w-64 lg:shrink-0">
      <div className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm lg:sticky lg:top-4">
        <div className="mb-3 flex items-center gap-2 border-b border-border-c pb-3">
          <SellerAvatar
            avatarUrl={avatarUrl}
            shopName={shopName}
            size={40}
            fallbackColorClassName="bg-ink text-brand"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{shopName}</p>
            <p className="text-xs text-muted">
              {verified ? "Người bán đã xác thực" : "Người bán"}
            </p>
          </div>
        </div>

        <Link
          href="/trang-ban-hang/quy-bao-hiem"
          className="mb-3 block rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/25 p-3 text-xs transition hover:bg-brand-light/40"
        >
          <p className="flex items-center gap-1.5 font-bold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" /> Quỹ Bảo Hiểm
          </p>
          <p className="mt-1 text-foreground/80">
            {formatVnd(insuranceBalance)} / {formatVnd(insuranceFundTarget)} — không bắt buộc,
            tăng độ tin cậy gian hàng.
          </p>
        </Link>

        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badgeCount = item.href === "/trang-ban-hang/san-pham" ? outOfStockCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition lg:whitespace-normal ${
                  active
                    ? "bg-brand text-ink"
                    : "text-foreground/70 hover:bg-surface-alt hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    title={`${badgeCount} sản phẩm đang hết hàng`}
                    className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-extrabold tabular-nums ${
                      active ? "bg-ink/15 text-ink" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
