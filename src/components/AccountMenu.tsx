import { Coins, Heart, History, LayoutGrid, User, Wallet } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { Role } from "@/lib/constants";

const menuItems = [
  { label: "Tài Khoản", href: "/don-hang", icon: User },
  { label: "Affiliate", href: "/affiliate", icon: Coins },
  { label: "Nạp Tiền", href: "/nap-tien", icon: Wallet },
  { label: "Lịch Sử Mua", href: "/don-hang", icon: History },
  { label: "Gian hàng yêu thích", href: "/nguoi-ban", icon: Heart },
];

export default function AccountMenu({ name, role }: { name: string; role: Role }) {
  const isSeller = role === "SELLER" || role === "ADMIN";
  const items = isSeller
    ? [
        ...menuItems,
        { label: "Quản Lý Bán Hàng", href: "/trang-ban-hang", icon: LayoutGrid },
      ]
    : menuItems;

  return (
    <div className="group relative flex h-full items-center">
      <Link
        href="/don-hang"
        className="flex h-10 items-center gap-2.5 overflow-hidden rounded-full border-2 border-ink bg-white pr-4 text-sm font-bold text-ink transition hover:bg-surface-alt"
      >
        <Avatar size={40} />
        {name}
      </Link>

      <div className="invisible absolute right-0 top-full z-50 w-56 translate-y-1 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mt-2 overflow-hidden rounded-xl border border-border-c bg-white py-2 shadow-xl">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-surface-alt hover:text-brand-dark"
            >
              <item.icon className="h-[18px] w-[18px] text-brand-dark" strokeWidth={2.5} />
              {item.label}
            </Link>
          ))}
          <Link
            href="/tro-thanh-nguoi-ban"
            className="flex items-center px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            Đăng ký bán hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
