import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SELLER_LEVEL_DEFAULT_CONFIGS,
  SELLER_LEVEL_DEFAULT_DISPUTE_PARTIAL_WEIGHT,
  SELLER_LEVEL_DEFAULT_DISPUTE_WINDOW_DAYS,
  SELLER_LEVEL_DEFAULT_GRACE_DAYS,
  SELLER_LEVEL_SETTING_ID,
  type SellerLevelBadgeTone,
} from "@/lib/constants";

type Db = PrismaClient | Prisma.TransactionClient;

// ============================================================================
// Cấu hình (lazy-create, cùng mẫu getPlatformFeeSetting() trong platform-fee.ts)
// ============================================================================

// Trả ĐỦ 5 dòng SellerLevelConfig, tạo dòng nào còn thiếu từ giá trị mặc
// định trong constants.ts — KHÔNG tạo lại nếu admin đã có/đã sửa (chỉ bù
// đúng level còn thiếu, an toàn khi thêm hạng mới sau này).
export async function getSellerLevelConfigs(db: Db = prisma) {
  const existing = await db.sellerLevelConfig.findMany({ orderBy: { level: "asc" } });
  const haveLevels = new Set(existing.map((c) => c.level));
  const missing = SELLER_LEVEL_DEFAULT_CONFIGS.filter((c) => !haveLevels.has(c.level));
  if (missing.length === 0) return existing;

  await Promise.all(
    missing.map((c) =>
      db.sellerLevelConfig
        .create({
          data: {
            level: c.level,
            name: c.name,
            badgeTone: c.badgeTone,
            minDistinctBuyers: c.minDistinctBuyers,
            minAvgRating: c.minAvgRating,
            minReviewCount: c.minReviewCount,
            maxDisputeRatePercent: c.maxDisputeRatePercent,
            productLimit: c.productLimit,
            feeDiscountPercent: c.feeDiscountPercent,
          },
        })
        .catch(() => null) // race giữa 2 request cùng lazy-create — bỏ qua trùng
    )
  );
  return db.sellerLevelConfig.findMany({ orderBy: { level: "asc" } });
}

export async function getSellerLevelSetting(db: Db = prisma) {
  const existing = await db.sellerLevelSetting.findUnique({ where: { id: SELLER_LEVEL_SETTING_ID } });
  if (existing) return existing;
  return db.sellerLevelSetting
    .create({
      data: {
        id: SELLER_LEVEL_SETTING_ID,
        downgradeGraceDays: SELLER_LEVEL_DEFAULT_GRACE_DAYS,
        disputePartialWeight: SELLER_LEVEL_DEFAULT_DISPUTE_PARTIAL_WEIGHT,
        disputeRateWindowDays: SELLER_LEVEL_DEFAULT_DISPUTE_WINDOW_DAYS,
      },
    })
    .catch(async () => (await db.sellerLevelSetting.findUnique({ where: { id: SELLER_LEVEL_SETTING_ID } }))!);
}

export type SellerLevelBadge = { level: number; name: string; tone: SellerLevelBadgeTone };

// Dùng cho hiển thị — map level -> {name, tone} theo config HIỆN HÀNH. Level
// không khớp dòng config nào (lẽ ra không xảy ra, phòng thủ) -> fallback tên
// "Hạng N" tone xám thay vì vỡ trang.
export function resolveLevelBadge(
  level: number,
  configs: { level: number; name: string; badgeTone: string }[]
): SellerLevelBadge {
  const found = configs.find((c) => c.level === level);
  return {
    level,
    name: found?.name ?? `Hạng ${level}`,
    tone: (found?.badgeTone as SellerLevelBadgeTone | undefined) ?? "gray",
  };
}

// ============================================================================
// Tính chỉ số THẬT của 1 seller
// ============================================================================

export type SellerLevelMetrics = {
  distinctBuyers: number;
  avgRating: number;
  reviewCount: number;
  disputeRatePercent: number;
};

// "Đơn hoàn thành" = SỐ BUYER KHÁC NHAU có >=1 OrderItem RELEASED từ seller
// này, LOẠI tự mua (Order.buyerId != sellerUserId) — chống gian lận tự tạo
// đơn ảo bằng chính tài khoản seller.
async function countDistinctBuyers(db: Db, sellerId: string, sellerUserId: string): Promise<number> {
  const rows = await db.order.findMany({
    where: {
      items: { some: { sellerId, status: "RELEASED" } },
      buyerId: { not: sellerUserId },
    },
    select: { buyerId: true },
    distinct: ["buyerId"],
  });
  return rows.length;
}

async function ratingAndReviewCount(db: Db, sellerId: string): Promise<{ avgRating: number; reviewCount: number }> {
  const agg = await db.review.aggregate({
    where: { sellerId, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count.rating };
}

// Tỉ lệ khiếu nại/hoàn tiền trong cửa sổ gần đây — xem giải thích đầy đủ
// trong kế hoạch đã duyệt (C:\Users\Admin\.claude\plans\
// effervescent-soaring-falcon.md mục 1c). Tóm tắt:
//   - Mẫu số: OrderItem status IN (RELEASED, CANCELLED), createdAt trong
//     cửa sổ windowDays gần nhất. ESCROW/DISPUTED (chưa ngã ngũ) không tính.
//   - CANCELLED luôn = 1.0 lỗi seller (bao gồm CẢ 3 nguồn: dispute hoàn toàn
//     bộ, seller trễ hạn giao VPS/Server, seller trễ hạn giao đặt trước —
//     3 nơi độc lập set status này, không chỉ qua bảng Dispute).
//   - RELEASED: 0 nếu không có Dispute hoặc Dispute RESOLVED_RELEASE (seller
//     thắng); RESOLVED_PARTIAL = partialWeight; RESOLVED_REFUND/
//     RESOLVED_INSURANCE = 1.0 (lỗi seller, dù đền từ ký quỹ hay quỹ bảo hiểm).
//   - Mẫu số = 0 (seller không có đơn nào ngã ngũ gần đây) -> rate = 0, coi
//     như ĐẠT (không phạt seller ít hoạt động thay vì phạt oan).
async function disputeRatePercent(
  db: Db,
  sellerId: string,
  windowDays: number,
  partialWeight: number
): Promise<number> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 3600_000);
  const items = await db.orderItem.findMany({
    where: { sellerId, status: { in: ["RELEASED", "CANCELLED"] }, createdAt: { gte: windowStart } },
    select: { id: true, status: true },
  });
  if (items.length === 0) return 0;

  const releasedIds = items.filter((i) => i.status === "RELEASED").map((i) => i.id);
  const disputes =
    releasedIds.length > 0
      ? await db.dispute.findMany({
          where: { orderItemId: { in: releasedIds } },
          select: { orderItemId: true, status: true },
        })
      : [];
  const disputeStatusByItem = new Map(disputes.map((d) => [d.orderItemId, d.status]));

  let numerator = 0;
  for (const item of items) {
    if (item.status === "CANCELLED") {
      numerator += 1;
      continue;
    }
    const dstatus = disputeStatusByItem.get(item.id);
    if (dstatus === "RESOLVED_REFUND" || dstatus === "RESOLVED_INSURANCE") numerator += 1;
    else if (dstatus === "RESOLVED_PARTIAL") numerator += partialWeight;
    // else: không có dispute, hoặc RESOLVED_RELEASE (seller thắng) -> 0
  }
  return (numerator / items.length) * 100;
}

export async function computeSellerLevelMetrics(
  db: Db,
  sellerId: string,
  sellerUserId: string,
  windowDays: number,
  partialWeight: number
): Promise<SellerLevelMetrics> {
  const [distinctBuyers, rating, disputeRate] = await Promise.all([
    countDistinctBuyers(db, sellerId, sellerUserId),
    ratingAndReviewCount(db, sellerId),
    disputeRatePercent(db, sellerId, windowDays, partialWeight),
  ]);
  return {
    distinctBuyers,
    avgRating: rating.avgRating,
    reviewCount: rating.reviewCount,
    disputeRatePercent: disputeRate,
  };
}

// Hạng CAO NHẤT thoả TẤT CẢ điều kiện (AND) — dò từ cao xuống thấp, hạng
// đầu tiên thoả hết thắng. LV1 luôn thoả (ngưỡng mặc định 0/0/0/100). Export
// để scripts/backfill-seller-levels.ts dùng LẠI ĐÚNG logic này (không viết
// lại 1 bản riêng có thể lệch dần theo thời gian).
export function qualifiedLevelFor(
  metrics: SellerLevelMetrics,
  configs: { level: number; minDistinctBuyers: number; minAvgRating: number; minReviewCount: number; maxDisputeRatePercent: number }[]
): number {
  const sorted = [...configs].sort((a, b) => b.level - a.level);
  for (const c of sorted) {
    if (
      metrics.distinctBuyers >= c.minDistinctBuyers &&
      metrics.avgRating >= c.minAvgRating &&
      metrics.reviewCount >= c.minReviewCount &&
      metrics.disputeRatePercent < c.maxDisputeRatePercent
    ) {
      return c.level;
    }
  }
  return 1;
}

// ============================================================================
// Tính lại + ghi (1 seller)
// ============================================================================

// Chạy NGOÀI transaction tiền đã gọi nó (best-effort, nơi gọi tự try/catch) —
// đây là quy ước bắt buộc, KHÔNG gọi hàm này bên trong 1 $transaction tiền
// đang mở (xem các điểm gọi ở escrow.ts/disputes.ts/route admin disputes).
export async function recomputeSellerLevel(sellerId: string): Promise<void> {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) return;

  const [configs, setting] = await Promise.all([getSellerLevelConfigs(), getSellerLevelSetting()]);
  const metrics = await computeSellerLevelMetrics(
    prisma,
    sellerId,
    seller.userId,
    setting.disputeRateWindowDays,
    setting.disputePartialWeight
  );
  const qualifiedLevel = qualifiedLevelFor(metrics, configs);
  const now = new Date();
  const snapshot = JSON.stringify(metrics);

  // Admin đã khoá — chỉ cập nhật mốc theo dõi, KHÔNG đụng level/pending state.
  if (seller.levelOverride !== null) {
    await prisma.seller.update({ where: { id: sellerId }, data: { levelRecomputedAt: now } });
    return;
  }

  // Tăng hạng — áp dụng NGAY, xoá mọi trạng thái "đang chờ tụt" nếu có.
  if (qualifiedLevel > seller.level) {
    await prisma.$transaction([
      prisma.seller.update({
        where: { id: sellerId },
        data: {
          level: qualifiedLevel,
          levelDowngradePendingTo: null,
          levelDowngradePendingSince: null,
          levelRecomputedAt: now,
        },
      }),
      prisma.sellerLevelHistory.create({
        data: {
          sellerId,
          fromLevel: seller.level,
          toLevel: qualifiedLevel,
          reason: "auto-upgrade",
          actorType: "SYSTEM",
          metricsSnapshot: snapshot,
        },
      }),
    ]);
    return;
  }

  // Đã hồi phục về đúng hạng hiện tại — xoá trạng thái "đang chờ tụt" (nếu có).
  if (qualifiedLevel === seller.level) {
    if (seller.levelDowngradePendingTo !== null) {
      await prisma.seller.update({
        where: { id: sellerId },
        data: { levelDowngradePendingTo: null, levelDowngradePendingSince: null, levelRecomputedAt: now },
      });
    } else {
      await prisma.seller.update({ where: { id: sellerId }, data: { levelRecomputedAt: now } });
    }
    return;
  }

  // qualifiedLevel < seller.level — đang/tiếp tục dưới ngưỡng.
  const samePendingTarget = seller.levelDowngradePendingTo === qualifiedLevel;
  if (!samePendingTarget) {
    // Mới phát hiện, hoặc chỉ số rớt thêm (target đổi) -> RESET mốc chờ.
    await prisma.seller.update({
      where: { id: sellerId },
      data: { levelDowngradePendingTo: qualifiedLevel, levelDowngradePendingSince: now, levelRecomputedAt: now },
    });
    return;
  }

  const graceMs = setting.downgradeGraceDays * 24 * 3600_000;
  const pendingSince = seller.levelDowngradePendingSince;
  const graceElapsed = pendingSince !== null && now.getTime() - pendingSince.getTime() >= graceMs;
  if (!graceElapsed) {
    await prisma.seller.update({ where: { id: sellerId }, data: { levelRecomputedAt: now } });
    return;
  }

  // Đủ thời gian chờ — tụt hạng thật.
  await prisma.$transaction([
    prisma.seller.update({
      where: { id: sellerId },
      data: {
        level: qualifiedLevel,
        levelDowngradePendingTo: null,
        levelDowngradePendingSince: null,
        levelRecomputedAt: now,
      },
    }),
    prisma.sellerLevelHistory.create({
      data: {
        sellerId,
        fromLevel: seller.level,
        toLevel: qualifiedLevel,
        reason: "auto-downgrade",
        actorType: "SYSTEM",
        metricsSnapshot: snapshot,
      },
    }),
  ]);
}

// ============================================================================
// Quét toàn bộ (cron hàng ngày + nút admin "Tính lại toàn bộ")
// ============================================================================

export async function sweepAllSellerLevels(): Promise<{ processed: number }> {
  const sellers = await prisma.seller.findMany({ select: { id: true } });
  let processed = 0;
  for (const s of sellers) {
    try {
      await recomputeSellerLevel(s.id);
      processed++;
    } catch (err) {
      console.error(`[seller-level] recompute thất bại cho seller ${s.id}`, err);
    }
  }
  await prisma.sellerLevelSetting.upsert({
    where: { id: SELLER_LEVEL_SETTING_ID },
    update: { lastSweepAt: new Date() },
    create: {
      id: SELLER_LEVEL_SETTING_ID,
      downgradeGraceDays: SELLER_LEVEL_DEFAULT_GRACE_DAYS,
      disputePartialWeight: SELLER_LEVEL_DEFAULT_DISPUTE_PARTIAL_WEIGHT,
      disputeRateWindowDays: SELLER_LEVEL_DEFAULT_DISPUTE_WINDOW_DAYS,
      lastSweepAt: new Date(),
    },
  });
  return { processed };
}

// Gọi SAU KHI transaction tiền đã commit — best-effort, không bao giờ throw
// ra ngoài (nơi triggering không được vỡ vì lỗi tính level). Dùng cho các
// điểm kích hoạt sự kiện (escrow release, dispute resolved, review mới).
export async function recomputeSellerLevelBestEffort(sellerId: string): Promise<void> {
  try {
    await recomputeSellerLevel(sellerId);
  } catch (err) {
    console.error(`[seller-level] recompute best-effort thất bại cho seller ${sellerId}`, err);
  }
}
