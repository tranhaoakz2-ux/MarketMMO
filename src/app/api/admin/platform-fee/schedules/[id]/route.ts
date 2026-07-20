import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const sch = await prisma.platformFeeSchedule.findUnique({ where: { id } });
  if (!sch) return NextResponse.json({ error: "Không tìm thấy mốc lịch phí." }, { status: 404 });

  await prisma.platformFeeSchedule.delete({ where: { id } });
  await logAdminAction({
    adminId: session!.user!.id,
    action: "Xoá mốc lịch phí sàn",
    targetType: "PlatformFeeSchedule",
    targetId: id,
    detail: `${sch.feePercent}% (${new Date(sch.startAt).toLocaleDateString("vi-VN")} – ${new Date(sch.endAt).toLocaleDateString("vi-VN")})`,
  });
  return NextResponse.json({ ok: true });
}

// Sửa mốc (feePercent / thời gian) — validate không chồng lấn với mốc KHÁC.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.platformFeeSchedule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy mốc lịch phí." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const feePercent = body?.feePercent === undefined ? existing.feePercent : Number(body.feePercent);
  const startAt = body?.startAt ? new Date(body.startAt) : existing.startAt;
  const endAt = body?.endAt ? new Date(body.endAt) : existing.endAt;

  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
    return NextResponse.json({ error: "% phí không hợp lệ (0–100)." }, { status: 400 });
  }
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return NextResponse.json({ error: "Thời gian không hợp lệ." }, { status: 400 });
  }
  const commission = await prisma.commissionSetting.findUnique({ where: { id: "singleton" } });
  const commissionPercent = commission?.commissionPercent ?? 0;
  if (commissionPercent * 2 >= feePercent) {
    return NextResponse.json(
      { error: `Phí kỳ (${feePercent}%) phải > 2× hoa hồng hiện tại (${commissionPercent}%).` },
      { status: 400 }
    );
  }
  // chồng lấn với mốc KHÁC (loại chính nó ra)
  const overlap = await prisma.platformFeeSchedule.findFirst({
    where: { id: { not: id }, startAt: { lte: endAt }, endAt: { gte: startAt } },
  });
  if (overlap) {
    return NextResponse.json({ error: "Khoảng thời gian chồng lấn với mốc khác." }, { status: 400 });
  }

  await prisma.platformFeeSchedule.update({ where: { id }, data: { feePercent, startAt, endAt } });
  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa mốc lịch phí sàn",
    targetType: "PlatformFeeSchedule",
    targetId: id,
    detail: `${feePercent}% (${startAt.toLocaleDateString("vi-VN")} – ${endAt.toLocaleDateString("vi-VN")})`,
  });
  return NextResponse.json({ ok: true });
}
