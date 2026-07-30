import { Flame } from "lucide-react";

// Badge "MEGA SALE -X%" dùng chung mọi nơi hiển thị sản phẩm đang sale (card,
// trang chi tiết) — gradient vàng-cam riêng biệt (không trùng đỏ của badge
// HOT, không trùng xanh chuối non của thương hiệu), theo lựa chọn tường minh
// của người dùng khi duyệt kế hoạch tính năng Mega Sale.
export default function MegaSaleBadge({
  percentOff,
  size = "md",
}: {
  percentOff: number;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 font-black text-ink shadow ${sizeClass}`}
    >
      <Flame className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      MEGA SALE -{percentOff}%
    </span>
  );
}
