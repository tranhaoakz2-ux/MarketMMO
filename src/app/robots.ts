import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Chặn crawl các trang riêng tư/nội bộ ở tầng robots.txt — LỚP 1, kết hợp
// với meta robots noindex ở từng trang (LỚP 2, xem CLAUDE.md mục SEO) để
// chắc chắn không rò rỉ trang chứa dữ liệu người dùng ra kết quả tìm kiếm.
//
// Đọc header Host của chính request để phân biệt domain chuẩn
// (marketmmo.vn) với domain tạm (market-mmo.vercel.app) — khi truy cập qua
// domain KHÔNG PHẢI domain chuẩn, chặn crawl toàn bộ site để tránh 2 domain
// cùng được index song song gây nội dung trùng lặp (xem thêm middleware.ts,
// nơi gắn header X-Robots-Tag cho cùng mục đích ở tầng response).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("host") ?? "";
  let canonicalHost = "marketmmo.vn";
  try {
    canonicalHost = new URL(SITE_URL).host;
  } catch {
    // giữ fallback ở trên nếu SITE_URL không hợp lệ
  }

  if (host && host !== canonicalHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/gio-hang",
        "/don-hang",
        "/tin-nhan",
        "/nap-tien",
        "/dang-nhap",
        "/quen-mat-khau",
        "/ho-so-ca-nhan",
        "/trang-ban-hang",
        "/trang-ban-hang/",
        "/admin",
        "/admin/",
        "/demo",
        "/demo/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
