import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lớp bảo vệ SỚM (không phải ranh giới chính — xem ghi chú CSRF dưới cho
  // nguyên tắc chung của file này): đã đăng nhập thì đá khỏi /dang-nhap
  // ngay ở middleware, trước khi Next.js kịp render Server Component, để
  // không có khung hình nào của form login lọt ra cho người đã có session.
  // Kiểm tra CHÍNH THỨC (bắt buộc, không thể bỏ qua) vẫn nằm ở chính
  // src/app/dang-nhap/page.tsx (gọi auth() + redirect()) — middleware chỉ
  // là tối ưu tốc độ/UX, KHÔNG coi đây là ranh giới bảo mật duy nhất.
  //
  // Dùng getToken() (chỉ verify chữ ký JWT bằng AUTH_SECRET qua thư viện
  // `jose`, không đụng Prisma/bcrypt) thay vì chỉ kiểm tra cookie có tồn
  // tại hay không — cố tình tránh 1 bẫy thật: nếu cookie còn trong trình
  // duyệt nhưng token đã hết hạn/không hợp lệ (đổi AUTH_SECRET, cookie giả
  // mạo...), kiểm tra "có cookie là coi như đã đăng nhập" sẽ đá người dùng
  // ra khỏi /dang-nhap VĨNH VIỄN mà không có cách nào đăng nhập lại qua URL
  // đó. getToken() verify đầy đủ chữ ký + hạn dùng nên không mắc bẫy này.
  if (req.method === "GET" && pathname === "/dang-nhap") {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!MUTATION_METHODS.has(req.method)) return NextResponse.next();

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
  matcher: ["/api/:path*", "/dang-nhap"],
};
