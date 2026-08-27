import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const VALID_SLOTS = ["LARGE", "SMALL_1", "SMALL_2"];

// Body: { slot: string, order: string[] } — sắp lại thứ tự slide TRONG ĐÚNG
// 1 SLOT (kéo-thả ở AdminHomeBannerPanel) — dùng chung cho cả 3 khu vực
// (LARGE/SMALL_1/SMALL_2 giờ đều nhiều slide, không còn riêng LARGE mới có
// khái niệm thứ tự). Cùng pattern với POST /api/admin/featured/sellers/reorder.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slot = typeof body?.slot === "string" ? body.slot : "";
  const order = body?.order;
  if (!VALID_SLOTS.includes(slot) || !Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const rows = await prisma.homeBanner.findMany({
    where: { slot },
    select: { id: true },
  });
  const ids = new Set(rows.map((r) => r.id));
  if (order.length !== ids.size || order.some((id: string) => !ids.has(id))) {
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
    action: `Sắp lại thứ tự slide banner trang chủ (${slot})`,
    targetType: "HomeBanner",
    detail: `${order.length} slide`,
  });

  return NextResponse.json({ ok: true });
}
