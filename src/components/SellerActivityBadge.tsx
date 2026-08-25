import { formatLastActive, type LastActiveTone } from "@/lib/format";

// Chấm tròn + nhãn trạng thái hoạt động của seller — tách thành component
// dùng chung để trang sản phẩm/shop/danh sách seller (nếu sau này cần) luôn
// hiện ĐÚNG 1 kiểu, không lệch màu/chữ giữa các nơi. Dữ liệu vẫn từ
// User.lastActiveAt thật (xem formatLastActive() trong src/lib/format.ts) —
// component này CHỈ quyết định màu/hiệu ứng hiển thị theo tone trả về.
const DOT_COLOR: Record<LastActiveTone, string> = {
  online: "bg-success",
  offline: "bg-danger",
  unknown: "bg-muted",
};

export default function SellerActivityBadge({
  lastActiveAt,
  className = "",
}: {
  lastActiveAt: string | Date | null | undefined;
  className?: string;
}) {
  const { label, tone } = formatLastActive(lastActiveAt);

  return (
    <span className={`flex items-center gap-1.5 text-xs font-semibold text-muted ${className}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {/* Nhấp nháy nhẹ CHỈ khi đang online — vòng ping mờ dần phía sau chấm
            đặc, hiệu ứng "live" quen thuộc, không cần keyframe tự viết. */}
        {tone === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT_COLOR[tone]}`} />
      </span>
      {label}
    </span>
  );
}
