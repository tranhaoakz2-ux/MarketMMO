import { cache } from "react";
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
  return { session, seller, error: null };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 }) };
  }
  return { session, error: null };
}
