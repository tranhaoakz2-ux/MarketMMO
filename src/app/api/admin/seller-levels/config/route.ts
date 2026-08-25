import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getSellerLevelConfigs, getSellerLevelSetting } from "@/lib/seller-level";
import { SELLER_LEVEL_SETTING_ID, type SellerLevelBadgeTone } from "@/lib/constants";

const VALID_TONES: SellerLevelBadgeTone[] = ["gray", "bronze", "silver", "gold", "diamond"];

// GET: 5 dòng ngưỡng+quyền lợi hiện hành + cấu hình chung (grace days, trọng
// số khiếu nại 1 phần, cửa sổ tính tỉ lệ khiếu nại, lần quét gần nhất).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [configs, setting] = await Promise.all([getSellerLevelConfigs(), getSellerLevelSetting()]);
  return NextResponse.json({ configs, setting });
}

// PATCH: sửa ngưỡng/quyền lợi 1 hoặc nhiều hạng + cấu hình chung. Không cho
// đổi `level`/tạo hạng mới ở đây (5 hạng cố định, chỉ sửa số) — validate đủ
// field bắt buộc, KHÔNG cho productLimit/feeDiscountPercent âm.
export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const configs = Array.isArray(body?.configs) ? body.configs : [];
  const settingInput = body?.setting;

  const existingConfigs = await getSellerLevelConfigs();
  const existingLevels = new Set(existingConfigs.map((c) => c.level));

  for (const c of configs) {
    const level = Number(c?.level);
    if (!existingLevels.has(level)) {
      return NextResponse.json({ error: `Hạng ${c?.level} không tồn tại.` }, { status: 400 });
    }
    const name = String(c?.name ?? "").trim();
    const badgeTone = c?.badgeTone as SellerLevelBadgeTone;
    const minDistinctBuyers = Number(c?.minDistinctBuyers);
    const minAvgRating = Number(c?.minAvgRating);
    const minReviewCount = Number(c?.minReviewCount);
    const maxDisputeRatePercent = Number(c?.maxDisputeRatePercent);
    const productLimit = c?.productLimit === null || c?.productLimit === "" ? null : Number(c?.productLimit);
    const feeDiscountPercent = Number(c?.feeDiscountPercent);

    if (!name) return NextResponse.json({ error: `Hạng ${level}: thiếu tên.` }, { status: 400 });
    if (!VALID_TONES.includes(badgeTone)) {
      return NextResponse.json({ error: `Hạng ${level}: màu badge không hợp lệ.` }, { status: 400 });
    }
    if (
      !Number.isFinite(minDistinctBuyers) || minDistinctBuyers < 0 ||
      !Number.isFinite(minAvgRating) || minAvgRating < 0 || minAvgRating > 5 ||
      !Number.isFinite(minReviewCount) || minReviewCount < 0 ||
      !Number.isFinite(maxDisputeRatePercent) || maxDisputeRatePercent < 0 || maxDisputeRatePercent > 100 ||
      (productLimit !== null && (!Number.isFinite(productLimit) || productLimit < 0)) ||
      !Number.isFinite(feeDiscountPercent) || feeDiscountPercent < 0 || feeDiscountPercent > 100
    ) {
      return NextResponse.json({ error: `Hạng ${level}: giá trị ngưỡng/quyền lợi không hợp lệ.` }, { status: 400 });
    }
  }

  let downgradeGraceDays: number | undefined;
  let disputePartialWeight: number | undefined;
  let disputeRateWindowDays: number | undefined;
  if (settingInput) {
    downgradeGraceDays = Number(settingInput.downgradeGraceDays);
    disputePartialWeight = Number(settingInput.disputePartialWeight);
    disputeRateWindowDays = Number(settingInput.disputeRateWindowDays);
    if (
      !Number.isFinite(downgradeGraceDays) || downgradeGraceDays < 0 ||
      !Number.isFinite(disputePartialWeight) || disputePartialWeight < 0 || disputePartialWeight > 1 ||
      !Number.isFinite(disputeRateWindowDays) || disputeRateWindowDays < 1
    ) {
      return NextResponse.json({ error: "Cấu hình chung không hợp lệ." }, { status: 400 });
    }
  }

  await prisma.$transaction(async (t) => {
    for (const c of configs) {
      await t.sellerLevelConfig.update({
        where: { level: Number(c.level) },
        data: {
          name: String(c.name).trim(),
          badgeTone: c.badgeTone,
          minDistinctBuyers: Number(c.minDistinctBuyers),
          minAvgRating: Number(c.minAvgRating),
          minReviewCount: Number(c.minReviewCount),
          maxDisputeRatePercent: Number(c.maxDisputeRatePercent),
          productLimit: c.productLimit === null || c.productLimit === "" ? null : Number(c.productLimit),
          feeDiscountPercent: Number(c.feeDiscountPercent),
          updatedById: session!.user!.id,
        },
      });
    }
    if (settingInput) {
      await t.sellerLevelSetting.upsert({
        where: { id: SELLER_LEVEL_SETTING_ID },
        update: { downgradeGraceDays, disputePartialWeight, disputeRateWindowDays },
        create: {
          id: SELLER_LEVEL_SETTING_ID,
          downgradeGraceDays: downgradeGraceDays!,
          disputePartialWeight: disputePartialWeight!,
          disputeRateWindowDays: disputeRateWindowDays!,
        },
      });
    }
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa cấu hình hạng người bán",
    targetType: "SellerLevelConfig",
    detail: `${configs.length} hạng${settingInput ? " + cấu hình chung" : ""}`,
  });

  return NextResponse.json({ ok: true });
}
