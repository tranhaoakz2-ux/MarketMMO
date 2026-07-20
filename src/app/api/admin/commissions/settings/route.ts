import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getCommissionSetting } from "@/lib/commission";
import { getPlatformFeeSetting } from "@/lib/platform-fee";
import { COMMISSION_SETTING_ID } from "@/lib/constants";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [setting, fee, history] = await Promise.all([
    getCommissionSetting(),
    getPlatformFeeSetting(),
    prisma.commissionRateChange.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { changedBy: { select: { name: true, username: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    setting: {
      commissionPercent: setting.commissionPercent,
      perReferrerCap: setting.perReferrerCap,
      capPeriodDays: setting.capPeriodDays,
      enabled: setting.enabled,
      updatedAt: setting.updatedAt,
    },
    // Phí sàn mặc định (chỉ đọc ở đây — sửa ở mục Phí sàn) + trần cho %hoa hồng.
    platformFeeDefault: fee.defaultFeePercent,
    // Ràng buộc mục #8: hoa hồng < phí/2 → net (phí − hoa hồng) > hoa hồng.
    maxCommissionPercent: fee.defaultFeePercent / 2,
    history: history.map((h) => ({
      id: h.id,
      by: h.changedBy.name ?? h.changedBy.username ?? h.changedBy.email ?? "admin",
      oldCommissionPercent: h.oldCommissionPercent,
      newCommissionPercent: h.newCommissionPercent,
      createdAt: h.createdAt,
    })),
  });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const commissionPercent = Number(body?.commissionPercent);
  const perReferrerCap = body?.perReferrerCap === undefined ? undefined : Number(body.perReferrerCap);
  const capPeriodDays = body?.capPeriodDays === undefined ? undefined : Number(body.capPeriodDays);

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    return NextResponse.json({ error: "% hoa hồng không hợp lệ (0–100)." }, { status: 400 });
  }
  if (perReferrerCap !== undefined && (!Number.isInteger(perReferrerCap) || perReferrerCap < 0)) {
    return NextResponse.json({ error: "Trần hoa hồng phải là số nguyên ≥ 0 (0 = không giới hạn)." }, { status: 400 });
  }
  if (capPeriodDays !== undefined && (!Number.isInteger(capPeriodDays) || capPeriodDays < 1)) {
    return NextResponse.json({ error: "Kỳ trần phải là số nguyên ngày ≥ 1." }, { status: 400 });
  }

  const fee = await getPlatformFeeSetting();
  // RÀNG BUỘC BẮT BUỘC (mục #8): % hoa hồng phải NHỎ HƠN phí_sàn/2 — để "phần
  // sàn thực thu ròng" (phí − hoa hồng) LUÔN LỚN HƠN hoa hồng. Vượt → TỪ CHỐI.
  if (commissionPercent * 2 >= fee.defaultFeePercent) {
    return NextResponse.json(
      {
        error: `Không thể lưu: % hoa hồng (${commissionPercent}%) phải NHỎ HƠN phí sàn / 2 = ${fee.defaultFeePercent / 2}% (để phần sàn thực thu ròng luôn lớn hơn hoa hồng). Tăng phí sàn hoặc giảm % hoa hồng.`,
      },
      { status: 400 }
    );
  }

  const current = await getCommissionSetting();

  // % mới CHỈ áp dụng cho hoa hồng phát sinh SAU thời điểm này — không hồi tố
  // (mỗi ReferralCommission đã lưu percentApplied riêng lúc tạo).
  await prisma.$transaction(async (t) => {
    await t.commissionSetting.update({
      where: { id: COMMISSION_SETTING_ID },
      data: {
        commissionPercent,
        ...(perReferrerCap !== undefined ? { perReferrerCap } : {}),
        ...(capPeriodDays !== undefined ? { capPeriodDays } : {}),
        updatedById: session!.user!.id,
      },
    });
    if (current.commissionPercent !== commissionPercent) {
      await t.commissionRateChange.create({
        data: {
          changedById: session!.user!.id,
          oldCommissionPercent: current.commissionPercent,
          newCommissionPercent: commissionPercent,
          // margin fields = phí sàn hiện tại (ngữ cảnh trần lúc đổi).
          oldMarginPercent: fee.defaultFeePercent,
          newMarginPercent: fee.defaultFeePercent,
        },
      });
    }
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đổi % hoa hồng",
    targetType: "CommissionSetting",
    detail: `Hoa hồng ${current.commissionPercent}%→${commissionPercent}% (phí sàn ${fee.defaultFeePercent}%)`,
  });

  return NextResponse.json({ ok: true });
}
