import Image from "next/image";
import { Store } from "lucide-react";

/**
 * Avatar gian hàng dùng chung cho MỌI nơi hiển thị seller (thẻ sản phẩm,
 * header gian hàng, dashboard seller, admin, chat...) — cùng nguyên tắc với
 * ProductThumbnail.tsx: ảnh thật (`avatarUrl`) nếu seller đã upload, fallback
 * về đúng hình dáng cũ nếu chưa (seller CHƯA upload thì giao diện y hệt
 * trước khi có tính năng này, không có gì đổi).
 *
 * `shape` và `fallback` tách riêng (không gộp chung 1 prop) vì các nơi gọi
 * hiện có kết hợp không đồng nhất: card dashboard seller dùng chữ cái đầu
 * NHƯNG bo góc vuông (rounded-2xl) như ProductThumbnail, còn avatar nhỏ trên
 * thẻ sản phẩm dùng chữ cái đầu bo tròn — trong khi icon Store (chỉ 1 nơi
 * dùng — header gian hàng công khai) luôn đi kèm bo góc vuông + viền nhẫn.
 */
export default function SellerAvatar({
  avatarUrl,
  shopName,
  size,
  shape = "circle",
  fallback = "letter",
  ring = false,
  fallbackColorClassName = "bg-brand text-ink",
  className = "",
  sizes,
}: {
  avatarUrl?: string | null;
  shopName: string;
  size: number;
  shape?: "circle" | "square";
  fallback?: "letter" | "store";
  /** Viền nhẫn nổi khối (dùng cho header gian hàng công khai) */
  ring?: boolean;
  /** Ghi đè màu nền/chữ của fallback chữ cái đầu — 1 vài nơi gọi (vd
      SellerSidebar) đã có sẵn tông màu riêng (nền tối/chữ vàng) trước khi có
      component này, giữ nguyên bằng cách truyền lại đúng class cũ tại đó. */
  fallbackColorClassName?: string;
  className?: string;
  sizes?: string;
}) {
  const shapeClass = shape === "square" ? "rounded-2xl" : "rounded-full";
  const ringClass = ring ? "shadow ring-4 ring-surface" : "";

  if (avatarUrl) {
    return (
      <span
        className={`relative inline-block shrink-0 overflow-hidden ${shapeClass} ${ringClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={avatarUrl} alt={shopName} fill sizes={sizes ?? `${size}px`} className="object-cover" />
      </span>
    );
  }

  if (fallback === "store") {
    return (
      <span
        className={`grid shrink-0 place-items-center ${shapeClass} bg-brand ${ringClass || "shadow"} ${className}`}
        style={{ width: size, height: size }}
      >
        <Store className="text-ink" style={{ width: size * 0.45, height: size * 0.45 }} />
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center ${shapeClass} font-black ${fallbackColorClassName} ${ringClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {shopName.charAt(0).toUpperCase()}
    </span>
  );
}
