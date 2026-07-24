"use client";

import {
  AlertTriangle,
  Clock,
  Gavel,
  LayoutGrid,
  Package,
  PackageCheck,
  Send,
  ShieldCheck,
  Star,
  Tag,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatVnd } from "@/lib/format";
import { INSURANCE_FUND_TARGET } from "@/lib/constants";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
};

const navItems: NavItem[] = [
  { label: "Tổng quan", href: "/trang-ban-hang", icon: LayoutGrid },
  { label: "Sản phẩm", href: "/trang-ban-hang/san-pham", icon: Package },
  { label: "Đơn sản phẩm", href: "/trang-ban-hang/don-san-pham", icon: PackageCheck },
  { label: "Đơn dịch vụ", href: "/trang-ban-hang/don-dich-vu", icon: Wrench },
  { label: "Đặt trước", href: "/trang-ban-hang/dat-truoc", icon: Clock },
  { label: "Mã giảm giá", href: "/trang-ban-hang/ma-giam-gia", icon: Tag },
  { label: "Rút tiền", href: "/trang-ban-hang/rut-tien", icon: Wallet },
  { label: "Quảng bá (Đấu giá)", href: "/trang-ban-hang/quang-ba", icon: Gavel },
  { label: "Khiếu nại", href: "/trang-ban-hang/khieu-nai", icon: AlertTriangle },
  { label: "Quỹ Bảo Hiểm", href: "/trang-ban-hang/quy-bao-hiem", icon: ShieldCheck },
  { label: "Đánh giá", href: "/trang-ban-hang/danh-gia", icon: Star },
  { label: "Telegram Bot", href: "/trang-ban-hang/telegram-bot", icon: Send },
];

export default function SellerSidebar({
  shopName,
  verified,
  insuranceBalance,
}: {
  shopName: string;
  verified: boolean;
  insuranceBalance: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/trang-ban-hang" ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="lg:w-64 lg:shrink-0">
      <div className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm lg:sticky lg:top-4">
        <div className="mb-3 flex items-center gap-2 border-b border-border-c pb-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-brand">
            {shopName.charAt(0).toUpperCase()}
          </div>
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
            <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" /> Quỹ bảo hiểm
          </p>
          <p className="mt-1 text-foreground/80">
            {formatVnd(insuranceBalance)} / {formatVnd(INSURANCE_FUND_TARGET)} — không bắt buộc,
            tăng độ tin cậy gian hàng.
          </p>
        </Link>

        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
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
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
