// Hạ tầng SEO dùng chung — domain chuẩn, helper URL tuyệt đối, cắt ngắn mô tả,
// object robots dùng lại cho mọi trang riêng tư (giỏ hàng, đơn hàng, ví, tin
// nhắn, khu vực người bán/admin...). Domain thật lấy từ NEXT_PUBLIC_SITE_URL
// (đặt ở .env local + Environment Variables trên Vercel) — fallback về
// https://marketmmo.vn nếu thiếu biến (không để trống rỗng gây lỗi URL).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketmmo.vn").replace(/\/+$/, "");

export const SITE_NAME = "MarketMMO";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-full.png`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Cắt mô tả về độ dài an toàn cho thẻ <meta name="description"> (Google
// thường hiển thị ~155-160 ký tự) — cắt theo ký tự rồi thêm "…", không cắt
// giữa từ nếu tránh được.
export function truncate(text: string, length = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  const cut = flat.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// Dùng cho mọi trang chứa dữ liệu riêng tư của người dùng (giỏ hàng, đơn
// hàng, ví, tin nhắn, đăng nhập, khu vực người bán/admin...) — không được
// Google index dù có lỡ bị crawl qua link nội bộ. Kết hợp với disallow
// tương ứng trong robots.ts (2 lớp, xem CLAUDE.md).
export const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
} as const;
