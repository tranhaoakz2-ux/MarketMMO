import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Tạo mốc lịch phí (mục #9A). KHÔNG cho chồng lấn với mốc khác (validate
// server): 2 khoảng [aS,aE] và [bS,bE] chồng lấn ⇔ aS ≤ bE ∧ aE ≥ bS.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const feePercent = Number(body?.feePercent);
  const startAt = body?.startAt ? new Date(body.startAt) : null;
  const endAt = body?.endAt ? new Date(body.endAt) : null;

  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
    return NextResponse.json({ error: "% phí không hợp lệ (0–100)." }, { status: 400 });
  }
  if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Thời gian bắt đầu/kết thúc không hợp lệ." }, { status: 400 });
  }
  if (startAt >= endAt) {
    return NextResponse.json({ error: "Thời gian bắt đầu phải trước thời gian kết thúc." }, { status: 400 });
  }

  // Ràng buộc giữ invariant #8: phí kỳ này cũng phải > 2× hoa hồng hiện tại.
  const commission = await prisma.commissionSetting.findUnique({ where: { id: "singleton" } });
  const commissionPercent = commission?.commissionPercent ?? 0;
  if (commissionPercent * 2 >= feePercent) {
    return NextResponse.json(
      { error: `Phí kỳ (${feePercent}%) phải > 2× hoa hồng hiện tại (${commissionPercent}%). Đặt phí kỳ > ${commissionPercent * 2}%.` },
      { status: 400 }
    );
  }

  const overlap = await prisma.platformFeeSchedule.findFirst({
    where: { startAt: { lte: endAt }, endAt: { gte: startAt } },
  });
  if (overlap) {
    return NextResponse.json(
      { error: `Khoảng thời gian chồng lấn với mốc đã có (${new Date(overlap.startAt).toLocaleDateString("vi-VN")} – ${new Date(overlap.endAt).toLocaleDateString("vi-VN")}). Các mốc không được chồng lấn.` },
      { status: 400 }
    );
  }

  const created = await prisma.platformFeeSchedule.create({
    data: { feePercent, startAt, endAt, createdById: session!.user!.id },
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Tạo mốc lịch phí sàn",
    targetType: "PlatformFeeSchedule",
    targetId: created.id,
    detail: `${feePercent}% từ ${startAt.toLocaleDateString("vi-VN")} đến ${endAt.toLocaleDateString("vi-VN")}`,
  });

  return NextResponse.json({ ok: true, id: created.id });
}
