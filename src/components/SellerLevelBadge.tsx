import { Award, Gem, Medal, Shield, Trophy } from "lucide-react";
import type { SellerLevelBadgeTone } from "@/lib/constants";

// Badge Hạng người bán — thay hoàn toàn `levelTier()` cũ (từng nằm trong
// SellerDirectory.tsx, chỉ đổi màu THUẦN theo số level, không có tên hạng
// thật). Dùng CHUNG ở mọi nơi hiện hạng (trang sản phẩm, trang shop, danh
// sách seller) — tone/name lấy từ SellerLevelConfig thật (xem
// resolveLevelBadge() trong src/lib/seller-level.ts), không tự suy ra từ số
// level nữa.
const TONE_CLASS: Record<SellerLevelBadgeTone, string> = {
  gray: "border-border-c bg-surface-alt text-muted",
  bronze: "border-amber-700/40 bg-amber-700/10 text-amber-800 dark:text-amber-500",
  silver: "border-slate-400/50 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  gold: "border-brand-dark bg-brand text-ink shadow-sm",
  diamond: "border-sky-400/50 bg-sky-400/10 text-sky-600 dark:text-sky-300",
};

const TONE_ICON: Record<SellerLevelBadgeTone, typeof Shield> = {
  gray: Shield,
  bronze: Medal,
  silver: Award,
  gold: Trophy,
  diamond: Gem,
};

export default function SellerLevelBadge({
  level,
  name,
  tone,
  className = "",
}: {
  level: number;
  name: string;
  tone: SellerLevelBadgeTone;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[tone]} ${className}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      LV{level} · {name}
    </span>
  );
}
