import type { NextConfig } from "next";

// Content-Security-Policy — bắt đầu ở mức HỢP LÝ, KHÔNG quá chặt để tránh chặn
// nhầm script/style hợp lệ của Next.js. Giải thích từng directive để review
// trước khi siết:
//  - default-src 'self': mặc định chỉ tải tài nguyên cùng origin.
//  - script-src 'self' 'unsafe-inline' 'unsafe-eval' + Turnstile: Next.js App
//    Router chèn script hydration/inline runtime nên tạm cần 'unsafe-inline'
//    ('unsafe-eval' cho một số lib/dev). Turnstile tải script từ Cloudflare.
//    (Siết sau bằng nonce nếu muốn — cần middleware sinh nonce mỗi request.)
//  - style-src 'self' 'unsafe-inline': Tailwind/inline style + style Next chèn.
//  - img-src 'self' data: blob: + Vercel Blob: ảnh sản phẩm/base64/preview.
//  - font-src 'self' data:.
//  - connect-src 'self' + Turnstile: fetch/XHR chỉ về server mình + Cloudflare
//    challenge (VNPay là điều hướng full-page nên không cần ở đây).
//  - frame-src Turnstile: widget chống bot render trong iframe Cloudflare.
//  - frame-ancestors 'none': KHÔNG cho ai nhúng site vào iframe (chống
//    clickjacking — mạnh hơn X-Frame-Options, áp cho trình duyệt mới).
//  - base-uri 'self', form-action 'self', object-src 'none': siết các vector
//    cổ điển (thẻ <base> độc, submit form ra ngoài, <object>/<embed>).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Chống clickjacking cho trình duyệt cũ (bổ sung frame-ancestors ở CSP).
  { key: "X-Frame-Options", value: "DENY" },
  // Chặn MIME sniffing — quan trọng cho file upload phục vụ trực tiếp.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Tắt các API nhạy cảm không dùng tới.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HSTS: Vercel đã ép HTTPS, thêm cho chắc (2 năm + preload).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Ảnh sản phẩm seller upload khi có cấu hình Vercel Blob (xem
      // saveProductImage() trong src/lib/uploads.ts) — public.blob.vercel-
      // storage.com, mỗi store Blob có 1 subdomain riêng nên cần wildcard.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
