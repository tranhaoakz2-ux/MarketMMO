import { SITE_URL } from "@/lib/seo";

// Dùng chung cho banner nhỏ trang chủ (SmallBannerCard) — validate ctaHref
// admin nhập (server: POST/PATCH /api/admin/home-banners, chặn bắt buộc;
// client: AdminHomeBannerPanel, báo sớm) và quyết định link nội bộ hay
// ngoài sàn (mở tab mới). File THUẦN, không import Prisma — an toàn dùng cả
// Client Component (HomePromoBanner.tsx, AdminHomeBannerPanel.tsx) lẫn
// Server (route API).
//
// Chấp nhận: rỗng (= xoá link, quay lại trang trí tĩnh), đường dẫn nội bộ
// bắt đầu bằng "/", hoặc URL đầy đủ http(s)://. Từ chối "javascript:",
// "data:", hoặc chuỗi không parse được thành URL hợp lệ — link này render
// thẳng thành href công khai cho MỌI khách truy cập trang chủ.
export function isValidCtaHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Đường dẫn nội bộ ("/...") luôn coi là same-site. URL tuyệt đối thì so
// hostname với SITE_URL (src/lib/seo.ts). Không parse được -> coi như không
// external (isValidCtaHref() đã là chốt chặn việc lưu chuỗi không hợp lệ).
export function isExternalHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("/")) return false;
  try {
    const target = new URL(trimmed);
    const site = new URL(SITE_URL);
    return target.hostname.toLowerCase() !== site.hostname.toLowerCase();
  } catch {
    return false;
  }
}
