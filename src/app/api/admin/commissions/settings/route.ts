import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getCommissionSetting } from "@/lib/commission";
import { COMMISSION_SETTING_ID } from "@/lib/constants";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [setting, history] = await Promise.all([
    getCommissionSetting(),
    prisma.commissionRateChange.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { changedBy: { select: { name: true, username: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    setting: {
      commissionPercent: setting.commissionPercent,
      platformMarginPercent: setting.platformMarginPercent,
      perReferrerCap: setting.perReferrerCap,
      capPeriodDays: setting.capPeriodDays,
      updatedAt: setting.updatedAt,
    },
    history: history.map((h) => ({
      id: h.id,
      by: h.changedBy.name ?? h.changedBy.username ?? h.changedBy.email ?? "admin",
      oldCommissionPercent: h.oldCommissionPercent,
      newCommissionPercent: h.newCommissionPercent,
      oldMarginPercent: h.oldMarginPercent,
      newMarginPercent: h.newMarginPercent,
      createdAt: h.createdAt,
    })),
  });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const commissionPercent = Number(body?.commissionPercent);
  const platformMarginPercent = Number(body?.platformMarginPercent);
  const perReferrerCap = body?.perReferrerCap === undefined ? undefined : Number(body.perReferrerCap);
  const capPeriodDays = body?.capPeriodDays === undefined ? undefined : Number(body.capPeriodDays);

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    return NextResponse.json({ error: "% hoa hồng không hợp lệ (0–100)." }, { status: 400 });
  }
  if (!Number.isFinite(platformMarginPercent) || platformMarginPercent < 0 || platformMarginPercent > 100) {
    return NextResponse.json({ error: "% margin sàn không hợp lệ (0–100)." }, { status: 400 });
  }
  // RÀNG BUỘC BẮT BUỘC: % hoa hồng phải NHỎ HƠN ngưỡng margin sàn (phần sàn
  // thực thu ròng) — để tổng hoa hồng luôn nhỏ hơn phần margin sàn thu được
  // trên mỗi giao dịch. Vượt thì TỪ CHỐI với lỗi rõ ràng.
  if (commissionPercent >= platformMarginPercent) {
    return NextResponse.json(
      {
        error: `Không thể lưu: % hoa hồng (${commissionPercent}%) phải NHỎ HƠN ngưỡng phần sàn thực thu ròng (${platformMarginPercent}%). Hoa hồng luôn phải dưới phần margin sàn thu được trên mỗi giao dịch.`,
      },
      { status: 400 }
    );
  }
  if (perReferrerCap !== undefined && (!Number.isInteger(perReferrerCap) || perReferrerCap < 0)) {
    return NextResponse.json({ error: "Trần hoa hồng phải là số nguyên ≥ 0 (0 = không giới hạn)." }, { status: 400 });
  }
  if (capPeriodDays !== undefined && (!Number.isInteger(capPeriodDays) || capPeriodDays < 1)) {
    return NextResponse.json({ error: "Kỳ trần phải là số nguyên ngày ≥ 1." }, { status: 400 });
  }

  const current = await getCommissionSetting();

  // % mới CHỈ áp dụng cho hoa hồng phát sinh SAU thời điểm này — không hồi tố
  // (mỗi ReferralCommission đã lưu percentApplied/marginPercentApplied riêng
  // lúc tạo, không đổi theo cài đặt mới).
  const updated = await prisma.$transaction(async (t) => {
    const s = await t.commissionSetting.update({
      where: { id: COMMISSION_SETTING_ID },
      data: {
        commissionPercent,
        platformMarginPercent,
        ...(perReferrerCap !== undefined ? { perReferrerCap } : {}),
        ...(capPeriodDays !== undefined ? { capPeriodDays } : {}),
        updatedById: session!.user!.id,
      },
    });
    // Ghi lịch sử nếu % thực sự đổi.
    if (
      current.commissionPercent !== commissionPercent ||
      current.platformMarginPercent !== platformMarginPercent
    ) {
      await t.commissionRateChange.create({
        data: {
          changedById: session!.user!.id,
          oldCommissionPercent: current.commissionPercent,
          newCommissionPercent: commissionPercent,
          oldMarginPercent: current.platformMarginPercent,
          newMarginPercent: platformMarginPercent,
        },
      });
    }
    return s;
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đổi cấu hình hoa hồng",
    targetType: "CommissionSetting",
    detail: `Hoa hồng ${current.commissionPercent}%→${commissionPercent}%, margin ${current.platformMarginPercent}%→${platformMarginPercent}%`,
  });

  return NextResponse.json({ ok: true, setting: { commissionPercent: updated.commissionPercent, platformMarginPercent: updated.platformMarginPercent } });
}
