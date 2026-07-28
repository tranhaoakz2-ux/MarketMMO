import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Ẩn/hiện 1 review — KHÔNG xoá cứng (giữ lại làm bằng chứng/lịch sử kiểm
// duyệt), cùng pattern POST /api/admin/forum-reports/[id] {action:"hide"}.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const review = await prisma.review.findUnique({
    where: { id },
    include: { seller: { select: { shopName: true } } },
  });
  if (!review) {
    return NextResponse.json({ error: "Không tìm thấy đánh giá." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "hide" && action !== "unhide") {
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  }

  const hidden = action === "hide";
  await prisma.review.update({ where: { id }, data: { hidden } });

  await logAdminAction({
    adminId: session!.user!.id,
    action: hidden ? "Ẩn đánh giá" : "Hiện lại đánh giá",
    targetType: "Review",
    targetId: id,
    detail: `${review.seller.shopName}: ${review.comment.slice(0, 80)}`,
  });

  return NextResponse.json({ ok: true });
}
