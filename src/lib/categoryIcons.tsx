import {
  Bot,
  Gamepad2,
  Inbox,
  KeyRound,
  Mail,
  MessageCircle,
  Music2,
  PlayCircle,
  Rocket,
  Users,
  type LucideIcon,
} from "lucide-react";

// Icon trung tính đại diện cho từng danh mục — cố tình KHÔNG dùng logo
// thương hiệu chính chủ (Gmail, Facebook, Discord...) để tránh vi phạm
// nhãn hiệu của bên thứ ba. Chỉ mang tính minh hoạ khái niệm (mail, video,
// chat game...), không phải logo hãng nào.
export const categoryIconMap: Record<string, LucideIcon> = {
  gmail: Mail,
  facebook: Users,
  youtube: PlayCircle,
  discord: Gamepad2,
  tiktok: Music2,
  outlook: Inbox,
  chatgpt: Bot,
  steam: KeyRound,
  twitter: MessageCircle,
  boosting: Rocket,
};

export function getCategoryIcon(categorySlug: string): LucideIcon {
  return categoryIconMap[categorySlug] ?? Mail;
}

// Màu tô riêng cho icon từng danh mục — chỉ để phân biệt trực quan (không
// phải màu thương hiệu chính xác của Gmail/Facebook/... nên không vi phạm
// nhãn hiệu), giúp menu đỡ đơn điệu khi toàn bộ icon cùng một màu xám.
export const categoryIconColorMap: Record<string, string> = {
  gmail: "text-red-500",
  facebook: "text-blue-600",
  youtube: "text-red-600",
  discord: "text-indigo-500",
  tiktok: "text-fuchsia-600",
  outlook: "text-sky-600",
  chatgpt: "text-emerald-600",
  steam: "text-slate-700",
  twitter: "text-cyan-500",
  boosting: "text-orange-500",
};

export function getCategoryIconColor(categorySlug: string): string {
  return categoryIconColorMap[categorySlug] ?? "text-ink/70";
}
