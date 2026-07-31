import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Body: { order: string[] } — xem giải thích đầy đủ ở route song sinh
// api/admin/featured/products/reorder (cùng logic, khác model).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const order = body?.order;
  if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const featured = await prisma.seller.findMany({
    where: { isFeatured: true },
    select: { id: true },
  });
  const featuredIds = new Set(featured.map((s) => s.id));
  if (order.length !== featuredIds.size || order.some((id: string) => !featuredIds.has(id))) {
    return NextResponse.json(
      { error: "Danh sách không khớp — có thể đã có thay đổi từ nơi khác, vui lòng tải lại." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((id: string, index: number) =>
      prisma.seller.update({ where: { id }, data: { featuredOrder: index } })
    )
  );

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sắp lại thứ tự seller nổi bật",
    targetType: "Seller",
    detail: `${order.length} seller`,
  });

  return NextResponse.json({ ok: true });
}
