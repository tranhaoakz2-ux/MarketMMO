-- Hệ thống LEVEL (hạng) người bán — thay Seller.level từ số tĩnh (seed cứng)
-- thành giá trị TÍNH TỰ ĐỘNG từ dữ liệu thật (xem src/lib/seller-level.ts,
-- kế hoạch đầy đủ đã duyệt tại C:\Users\Admin\.claude\plans\
-- effervescent-soaring-falcon.md). File này CHỈ đổi schema — không có dữ
-- liệu nghiệp vụ nào (ngưỡng/quyền lợi từng hạng) được seed cứng ở đây; 5
-- dòng SellerLevelConfig + 1 dòng SellerLevelSetting được LAZY-CREATE bằng
-- code (cùng mẫu getPlatformFeeSetting() đã có, xem src/lib/platform-fee.ts)
-- với giá trị mặc định khai trong src/lib/constants.ts — sửa số sau này chỉ
-- cần qua trang admin, không cần chạy SQL lại.
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, sau đó tôi mới sửa schema.prisma + chạy `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

-- 1) Seller: cột mới cho ghi đè/khoá admin + chống nhấp nháy khi tụt hạng.
--    Tất cả nullable, KHÔNG đổi ý nghĩa cột "level" hiện có (vẫn là giá trị
--    HIỆU LỰC đang hiển thị) — chỉ thêm cơ chế bên cạnh nó.
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "levelOverride" INTEGER;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "levelDowngradePendingTo" INTEGER;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "levelDowngradePendingSince" TIMESTAMP(3);
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "levelRecomputedAt" TIMESTAMP(3);

-- 2) Cấu hình từng hạng (5 dòng, level 1-5) — ngưỡng + quyền lợi, admin sửa
--    qua /admin/hang-nguoi-ban (PATCH /api/admin/seller-levels/config).
CREATE TABLE IF NOT EXISTS "SellerLevelConfig" (
  "level" INTEGER NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "badgeTone" TEXT NOT NULL,
  "minDistinctBuyers" INTEGER NOT NULL DEFAULT 0,
  "minAvgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minReviewCount" INTEGER NOT NULL DEFAULT 0,
  "maxDisputeRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "productLimit" INTEGER,
  "feeDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" TEXT
);

-- 3) Cấu hình chung (singleton, 1 dòng cố định id="default") — cửa sổ tính
--    tỉ lệ khiếu nại, trọng số hoàn 1 phần, số ngày chờ trước khi tụt hạng.
CREATE TABLE IF NOT EXISTS "SellerLevelSetting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "downgradeGraceDays" INTEGER NOT NULL DEFAULT 14,
  "disputePartialWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "disputeRateWindowDays" INTEGER NOT NULL DEFAULT 90,
  "lastSweepAt" TIMESTAMP(3)
);

-- 4) Log mỗi lần đổi hạng (tăng/tụt tự động, admin ghi đè/gỡ ghi đè, backfill)
--    — hiển thị lịch sử riêng cho từng seller ở trang admin.
CREATE TABLE IF NOT EXISTS "SellerLevelHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fromLevel" INTEGER NOT NULL,
  "toLevel" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "metricsSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SellerLevelHistory_sellerId_idx" ON "SellerLevelHistory"("sellerId");

-- 5) Index tăng tốc quét chỉ số theo seller (COUNT DISTINCT buyer, tỉ lệ
--    khiếu nại theo cửa sổ thời gian) — KHÔNG đổi hành vi truy vấn nào hiện
--    có, chỉ thêm index.
CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_status_createdAt_idx"
  ON "OrderItem" ("sellerId", "status", "createdAt");
