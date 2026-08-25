// Script CHẠY 1 LẦN (không tự động, KHÔNG chạy trong lúc dev/build/deploy) —
// tính hạng THẬT cho toàn bộ seller đang có trong DB từ lịch sử đơn hàng/
// đánh giá/khiếu nại thật, thay cho giá trị Seller.level cũ (trước đây chỉ là
// số tĩnh: 1 lúc đăng ký, hoặc 4 gán cứng cho seller seed demo — không phản
// ánh gì thật). Chạy bằng:
//
//   npx tsx scripts/backfill-seller-levels.ts
//
// Dùng LẠI đúng computeSellerLevelMetrics()/qualifiedLevelFor() ở
// src/lib/seller-level.ts (không viết lại 1 bản tính riêng có thể lệch dần).
// KHÁC với recomputeSellerLevel() dùng lúc vận hành: backfill set hạng
// TÍNH ĐƯỢC ngay lập tức theo CẢ 2 CHIỀU (không chỉ tăng ngay, tụt cũng ngay,
// không qua cơ chế "chờ downgradeGraceDays") — vì đây là lần đầu áp dữ liệu
// thật, không phải 1 lần biến động ngắn hạn cần chống nhấp nháy. Seller đang
// bị admin khoá hạng (Seller.levelOverride != null) được BỎ QUA hoàn toàn,
// giữ nguyên giá trị admin đã đặt.
import { prisma } from "@/lib/prisma";
import { getSellerLevelConfigs, getSellerLevelSetting, computeSellerLevelMetrics, qualifiedLevelFor } from "@/lib/seller-level";

async function main() {
  const [configs, setting, sellers] = await Promise.all([
    getSellerLevelConfigs(),
    getSellerLevelSetting(),
    prisma.seller.findMany({ select: { id: true, shopName: true, userId: true, level: true, levelOverride: true } }),
  ]);

  console.log(`Tìm thấy ${sellers.length} seller. Bắt đầu tính lại từ dữ liệu thật...\n`);

  let changed = 0;
  let skippedLocked = 0;
  let unchanged = 0;

  for (const seller of sellers) {
    if (seller.levelOverride !== null) {
      console.log(`- [KHOÁ] ${seller.shopName}: giữ nguyên LV${seller.level} (admin đã khoá) — bỏ qua.`);
      skippedLocked++;
      continue;
    }

    const metrics = await computeSellerLevelMetrics(
      prisma,
      seller.id,
      seller.userId,
      setting.disputeRateWindowDays,
      setting.disputePartialWeight
    );
    const qualifiedLevel = qualifiedLevelFor(metrics, configs);

    if (qualifiedLevel === seller.level) {
      console.log(`- [GIỮ NGUYÊN] ${seller.shopName}: LV${seller.level} (buyer=${metrics.distinctBuyers}, rating=${metrics.avgRating.toFixed(2)}, review=${metrics.reviewCount}, khiếu nại=${metrics.disputeRatePercent.toFixed(1)}%)`);
      unchanged++;
      continue;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.seller.update({
        where: { id: seller.id },
        data: {
          level: qualifiedLevel,
          levelDowngradePendingTo: null,
          levelDowngradePendingSince: null,
          levelRecomputedAt: now,
        },
      }),
      prisma.sellerLevelHistory.create({
        data: {
          sellerId: seller.id,
          fromLevel: seller.level,
          toLevel: qualifiedLevel,
          reason: "backfill",
          actorType: "SYSTEM",
          metricsSnapshot: JSON.stringify(metrics),
        },
      }),
    ]);
    console.log(`- [ĐỔI] ${seller.shopName}: LV${seller.level} → LV${qualifiedLevel} (buyer=${metrics.distinctBuyers}, rating=${metrics.avgRating.toFixed(2)}, review=${metrics.reviewCount}, khiếu nại=${metrics.disputeRatePercent.toFixed(1)}%)`);
    changed++;
  }

  console.log(`\nXong. Đổi: ${changed} · Giữ nguyên: ${unchanged} · Bỏ qua (đã khoá): ${skippedLocked}.`);
}

main()
  .catch((err) => {
    console.error("Script thất bại:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
