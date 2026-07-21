import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Dùng cho Server Component (page/layout), KHÔNG dùng cho API route (dùng
// requireUser/requireSeller/requireAdmin bên dưới thay vào đó). Bọc bằng
// React cache() để layout.tsx và page.tsx con cùng gọi trong 1 request chỉ
// tốn đúng 1 lần truy vấn thật (Next.js dedupe theo tham số giống hệt) —
// tránh mỗi trang trong Quản Lý Bán Hàng phải tự query lại session/seller mà
// layout cha đã query rồi.
export const getAuthSession = cache(async () => auth());

export const getSellerForUser = cache(async (userId: string) =>
  prisma.seller.findUnique({ where: { userId } })
);

// Guard cho Server Component TRANG admin (page.tsx) — phòng thủ NHIỀU LỚP bên
// cạnh guard ở admin/layout.tsx. Next.js không đảm bảo layout luôn là ranh giới
// bảo mật (client Router Cache có thể phục vụ lại RSC đã cache trên soft-nav),
// nên MỖI trang admin tự kiểm role ở server thay vì chỉ dựa layout. Dùng
// getAuthSession() (React cache) nên layout + page trong cùng request chỉ tốn 1
// query session thật. redirect() ném NEXT_REDIRECT (dừng render) — an toàn.
export async function requireAdminPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/admin");
  if (session.user.banned || session.user.role !== "ADMIN") redirect("/");
  return session;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 }) };
  }
  if (session.user.banned) {
    return {
      session: null,
      error: NextResponse.json({ error: "Tài khoản của bạn đã bị khoá." }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export async function requireSeller() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      seller: null,
      error: NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 }),
    };
  }
  if (session.user.banned) {
    return {
      session: null,
      seller: null,
      error: NextResponse.json({ error: "Tài khoản của bạn đã bị khoá." }, { status: 403 }),
    };
  }
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) {
    return {
      session,
      seller: null,
      error: NextResponse.json(
        { error: "Bạn cần đăng ký bán hàng trước khi quản lý sản phẩm." },
        { status: 403 }
      ),
    };
  }
  // Gian hàng bị admin khoá (Seller.suspended) không được thao tác bất kỳ
  // hành động bán hàng nào (đăng sản phẩm, rút tiền, đấu giá, mã giảm giá...).
  // Đây là chốt chặn ở TẦNG API — bổ sung cho việc query công khai đã ẩn sản
  // phẩm của họ khỏi site. KHÔNG ảnh hưởng khả năng dùng chat/diễn đàn/mua
  // hàng của họ như 1 user thường (những luồng đó dùng requireUser, không
  // phải requireSeller).
  if (seller.suspended) {
    return {
      session,
      seller: null,
      error: NextResponse.json(
        { error: "Gian hàng của bạn đã bị tạm khoá. Vui lòng liên hệ quản trị viên." },
        { status: 403 }
      ),
    };
  }
  return { session, seller, error: null };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 }) };
  }
  // Defense-in-depth: chặn cả tài khoản bị khoá (route ban đã chặn không cho
  // ban role ADMIN, nhưng vẫn kiểm tra ở đây phòng trường hợp DB bị sửa trực
  // tiếp hoặc role bị đổi sau khi ban).
  if (session.user.banned) {
    return {
      session: null,
      error: NextResponse.json({ error: "Tài khoản của bạn đã bị khoá." }, { status: 403 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 }) };
  }
  return { session, error: null };
}
