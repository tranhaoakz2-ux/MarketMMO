import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CSRF defense-in-depth cho các Route Handler tự viết (Next.js Server Action có
// bảo vệ origin sẵn, nhưng ở đây KHÔNG có Server Action nào — mọi mutation qua
// Route Handler). Cookie session đã là SameSite=Lax (chặn gửi cookie trên
// cross-site POST), đây là LỚP THỨ 2: từ chối request đổi trạng thái (POST/PUT/
// PATCH/DELETE) tới /api/* nếu header Origin KHÁC host của site.
//
// Lưu ý: đây CHỈ là lớp phụ chống CSRF — xác thực/uỷ quyền vẫn nằm trong từng
// route (requireUser/requireSeller/requireAdmin). Không dựa middleware làm ranh
// giới bảo mật chính (Next 16 đã vá CVE-2025-29927 middleware-bypass).
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  if (!MUTATION_METHODS.has(req.method)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Bỏ qua các endpoint được gọi HỢP LỆ từ nguồn khác origin:
  //  - /api/payment/vnpay/*: VNPay gọi server-to-server (không có Origin cùng host).
  //  - /api/auth/*: Auth.js tự có cơ chế CSRF token riêng.
  if (pathname.startsWith("/api/payment/vnpay/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const origin = req.headers.get("origin");
  // Không có Origin (một số client không phải trình duyệt / same-origin cũ) ->
  // cho qua, vẫn được SameSite=Lax bảo vệ. Có Origin mà KHÁC host -> chặn.
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    if (originHost !== req.headers.get("host")) {
      return NextResponse.json({ error: "Yêu cầu bị từ chối (CSRF)." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
