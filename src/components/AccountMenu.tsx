import { Coins, History, LayoutGrid, User, Wallet } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { Role } from "@/lib/constants";

// "Gian hàng yêu thích" đã bị bỏ khỏi menu — trước đây trỏ /nguoi-ban (danh
// sách TẤT CẢ seller, không cá nhân hoá) vì hệ thống chưa có tính năng
// wishlist/yêu thích thật (không có model nào trong schema). Không tự dựng
// tính năng wishlist mới ở đây — chỉ ẩn mục gây hiểu nhầm cho tới khi có
// tính năng thật.
const menuItems = [
  { label: "Tài Khoản", href: "/ho-so-ca-nhan", icon: User },
  { label: "Affiliate", href: "/affiliate", icon: Coins },
  { label: "Nạp Tiền", href: "/nap-tien", icon: Wallet },
  { label: "Lịch Sử Mua", href: "/don-hang", icon: History },
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
        href="/ho-so-ca-nhan"
        className="flex h-10 items-center gap-2.5 overflow-hidden rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] pr-4 text-sm font-bold text-white transition hover:brightness-110"
      >
        <Avatar size={40} />
        {name}
      </Link>

      <div className="invisible absolute right-0 top-full z-50 w-56 translate-y-1 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mt-2 overflow-hidden rounded-xl border border-border-c bg-surface py-2 shadow-xl">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
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
