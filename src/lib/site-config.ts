import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Nội dung động quản lý qua Admin (/admin/noi-dung) — xem model SiteConfig
// trong prisma/schema.prisma. Giá trị DB (nếu admin đã lưu) LUÔN ưu tiên hơn
// mặc định code bên dưới; thiếu dòng/value rỗng thì tự fallback về mặc định
// — không phá vỡ giao diện hiện tại, chỉ khi admin chủ động lưu mới ghi đè.
export type SiteConfigKey =
  | "insurance_fund_target"
  | "header_ticker_text"
  | "footer_facebook_url"
  | "footer_youtube_url"
  | "footer_tiktok_url"
  | "footer_zalo_url"
  | "footer_messenger_url"
  | "footer_phone"
  | "footer_telegram_url"
  | "search_tags";

// Mặc định hiện có trong code TRƯỚC khi có SiteConfig — giữ nguyên y hệt để
// không đổi giao diện cho tới khi admin chủ động sửa.
const DEFAULTS: Record<SiteConfigKey, string> = {
  insurance_fund_target: "300000",
  header_ticker_text:
    "🔔 MAKETMMO — Mua bán sản phẩm số phục vụ kiếm tiền online. Mọi giao dịch trên sàn đều hoàn toàn tự động và được ký quỹ an toàn.",
  footer_facebook_url: "",
  footer_youtube_url: "",
  footer_tiktok_url: "",
  footer_zalo_url: "",
  footer_messenger_url: "",
  footer_phone: "",
  footer_telegram_url: "",
  // Mặc định RỖNG (đổi từ danh sách hardcode cũ theo yêu cầu chủ sàn tự
  // kiểm soát hoàn toàn từ khóa hiển thị ở khối "Tìm kiếm phổ biến" cuối
  // trang chủ) — khối này tự ẩn khi rỗng (xem src/app/page.tsx). Tự thêm
  // từ khóa qua Admin > Nội dung trang web khi cần.
  search_tags: JSON.stringify([]),
};

export const ALL_SITE_CONFIG_KEYS = Object.keys(DEFAULTS) as SiteConfigKey[];

// Bọc React cache() để nhiều lần gọi trong cùng 1 request chỉ tốn đúng 1
// query DB — cùng pattern getPaymentConfig()/getAuthSession().
const loadDbConfig = cache(async () => {
  const rows = await prisma.siteConfig.findMany();
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.value && row.value.trim()) map.set(row.key, row.value.trim());
  }
  return map;
});

/** Giá trị HIỆU LỰC hiện tại (DB nếu admin đã lưu, không thì mặc định code). */
export async function getSiteConfigValue(key: SiteConfigKey): Promise<string> {
  const db = await loadDbConfig();
  return db.get(key) ?? DEFAULTS[key];
}

export type SiteConfigSource = "db" | "default";

/** Dùng cho admin UI — trả giá trị hiệu lực KÈM nguồn cho từng key. */
export async function getSiteConfigWithSource(): Promise<
  Record<SiteConfigKey, { value: string; source: SiteConfigSource }>
> {
  const db = await loadDbConfig();
  const result = {} as Record<SiteConfigKey, { value: string; source: SiteConfigSource }>;
  for (const key of ALL_SITE_CONFIG_KEYS) {
    const dbValue = db.get(key);
    result[key] = dbValue ? { value: dbValue, source: "db" } : { value: DEFAULTS[key], source: "default" };
  }
  return result;
}

/** Dùng cho trang chủ (Server Component) — danh sách tag tìm kiếm phổ biến. */
export async function getSearchTags(): Promise<string[]> {
  const raw = await getSiteConfigValue("search_tags");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((t) => typeof t === "string")) return parsed;
  } catch {
    // rơi về mặc định bên dưới nếu JSON hỏng
  }
  return JSON.parse(DEFAULTS.search_tags);
}

/** Dùng cho các trang seller (Server Component) — mức quỹ bảo hiểm gợi ý (VNĐ). */
export async function getInsuranceFundTarget(): Promise<number> {
  const raw = await getSiteConfigValue("insurance_fund_target");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : Number(DEFAULTS.insurance_fund_target);
}
