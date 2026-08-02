import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Body: { order: string[] } — sắp lại thứ tự slide slot="LARGE" (kéo-thả ở
// AdminHomeBannerPanel). Cùng pattern với
// POST /api/admin/featured/sellers/reorder — chỉ áp dụng cho slot LARGE, 2
// banner nhỏ cố định không có khái niệm thứ tự giữa chúng.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const order = body?.order;
  if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const largeRows = await prisma.homeBanner.findMany({
    where: { slot: "LARGE" },
    select: { id: true },
  });
  const largeIds = new Set(largeRows.map((r) => r.id));
  if (order.length !== largeIds.size || order.some((id: string) => !largeIds.has(id))) {
    return NextResponse.json(
      { error: "Danh sách không khớp — có thể đã có thay đổi từ nơi khác, vui lòng tải lại." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((id: string, index: number) => prisma.homeBanner.update({ where: { id }, data: { sortOrder: index } }))
  );

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sắp lại thứ tự slide banner lớn trang chủ",
    targetType: "HomeBanner",
    detail: `${order.length} slide`,
  });

  return NextResponse.json({ ok: true });
}
