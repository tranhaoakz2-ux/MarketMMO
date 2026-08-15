-- XÂY DỰNG LẠI HOÀN CHỈNH tính năng "Quảng bá (Đấu giá) — Vị trí vàng".
--
-- Thay thế mô hình cũ (6 vị trí cố định AuctionSlot, mỗi vị trí tự đóng/mở
-- riêng, KHÔNG khoá tiền lúc đặt giá — dễ bị "ghost bid") bằng mô hình mới
-- đơn giản hơn: 1 PHIÊN DUY NHẤT mỗi tối Chủ Nhật (20:00–22:00 giờ VN),
-- Top N bid cao nhất thắng N vị trí (N do admin cấu hình), TIỀN BỊ KHOÁ
-- NGAY lúc đặt giá (đúng khuôn mẫu khoá tiền của hệ thống rút tiền).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, báo lại để tôi sync schema.prisma + `npx prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.
--
-- QUAN TRỌNG — DROP DỮ LIỆU CŨ: AuctionSlot (6 vị trí cố định) và AuctionBid
-- (cấu trúc cũ gắn theo slot) bị XOÁ HẲN, gồm cả dữ liệu demo/seed hiện có
-- (vài lượt bid mẫu tạo lúc `npm run db:seed`, không phải giao dịch tiền thật
-- — hệ thống cũ chưa từng khoá/trừ tiền lúc đặt giá nên không có tiền thật
-- nào cần hoàn trước khi xoá). Nếu bạn muốn giữ lại lịch sử bid cũ để tham
-- khảo, hãy tự export bảng "AuctionSlot"/"AuctionBid" trước khi chạy file
-- này — sau khi DROP sẽ không khôi phục được.

-- ============================================================
-- PHẦN A — Xoá mô hình cũ (6 vị trí cố định)
-- ============================================================

-- CASCADE tự xoá luôn FK từ AuctionBid trỏ vào AuctionSlot. AuctionBid
-- KHÔNG có gì tham chiếu ngược lại từ bảng khác (WalletTransaction hệ cũ
-- không có cột nào trỏ tới AuctionBid — tiền lúc thắng ghi qua `note` tự do,
-- xem src/lib/auction.ts bản cũ) nên xoá an toàn, không mồ côi dữ liệu ở bảng
-- khác.
DROP TABLE IF EXISTS "AuctionBid" CASCADE;
DROP TABLE IF EXISTS "AuctionSlot" CASCADE;

-- ============================================================
-- PHẦN B — AuctionSetting (singleton, admin cấu hình N + giá sàn)
-- ============================================================

-- Cùng pattern PlatformFeeSetting/CommissionSetting (id cố định "singleton",
-- lazy-tạo lần đầu đọc qua getAuctionSetting(), KHÔNG cần seed thủ công).
-- slotCount = số vị trí vàng (Top N thắng); floorPrice = giá đấu tối thiểu
-- ÁP DỤNG CHUNG cho mọi bid (thay cho floorPrice riêng từng slot của hệ cũ —
-- hệ mới chỉ còn 1 phiên/tuần, không còn khái niệm "slot" nên gộp về 1 mức
-- sàn duy nhất, đơn giản hơn).
CREATE TABLE IF NOT EXISTS "AuctionSetting" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "slotCount"   INTEGER NOT NULL DEFAULT 6,
  "floorPrice"  INTEGER NOT NULL DEFAULT 50000,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" TEXT
);

-- ============================================================
-- PHẦN C — AuctionSession (1 phiên = đúng 1 khung 20:00–22:00 tối CN)
-- ============================================================

-- Chỉ được TẠO LƯỜI lúc có bid đầu tiên rơi đúng khung giờ (xem
-- getOrCreateCurrentSession() trong src/lib/auction.ts, code sau) — tuần nào
-- không ai đặt giá thì không có dòng nào, tránh rác dữ liệu. windowStart là
-- mốc UTC quy đổi từ "20:00 Chủ Nhật đó, giờ Asia/Ho_Chi_Minh" — UNIQUE vừa
-- để xác định đúng phiên của tuần nào vừa chặn tạo trùng (2 bid đầu tiên
-- cùng lúc dùng upsert theo cột này).
CREATE TABLE IF NOT EXISTS "AuctionSession" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd"   TIMESTAMP(3) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'OPEN',
  "slotCount"   INTEGER,
  "closedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionSession_windowStart_key" ON "AuctionSession"("windowStart");

-- ============================================================
-- PHẦN D — AuctionBid (cấu trúc mới, gắn theo phiên thay vì theo slot)
-- ============================================================

-- amount = số tiền ĐANG BỊ KHOÁ khỏi walletBalance của seller (vá "ghost
-- bid" — hệ cũ không khoá gì lúc đặt giá). holdTransactionId trỏ đúng 1
-- WalletTransaction đại diện khoản khoá HIỆN TẠI (type AUCTION_HOLD, status
-- PENDING trong lúc còn khoá) — nâng giá = 1 transaction DB vừa hoàn khoá cũ
-- (WalletTransaction cũ PENDING→REJECTED + cộng lại walletBalance) vừa khoá
-- mức mới (tạo WalletTransaction mới, trừ walletBalance), UPDATE cột này
-- sang bản ghi mới. @@unique([sessionId, sellerId]): tối đa 1 bid/seller/
-- phiên — đổi ý = nâng giá CÙNG dòng, không tạo dòng mới.
CREATE TABLE IF NOT EXISTS "AuctionBid" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "sessionId"         TEXT NOT NULL REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sellerId"          TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId"         TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "amount"            INTEGER NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'ACTIVE',
  "holdTransactionId" TEXT,
  "rank"              INTEGER,
  "decidedAt"         TIMESTAMP(3),
  "decidedById"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionBid_sessionId_sellerId_key" ON "AuctionBid"("sessionId", "sellerId");
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionBid_holdTransactionId_key" ON "AuctionBid"("holdTransactionId");
CREATE INDEX IF NOT EXISTS "AuctionBid_sessionId_status_idx" ON "AuctionBid"("sessionId", "status");

-- ============================================================
-- PHẦN E — WalletTransaction.auctionBidId (khoá ngoại thật, audit)
-- ============================================================

-- Cùng lý do đã áp dụng cho orderId/orderItemId (xem
-- 2026-08-04-wallet-order-link.sql): nối tiền với bid bằng khoá ngoại thật
-- thay vì chuỗi tự do trong `note`. Nullable — chỉ có giá trị với dòng
-- type="AUCTION_HOLD"/"PURCHASE" phát sinh từ đấu giá, NULL với mọi loại
-- giao dịch khác (DEPOSIT/WITHDRAW/...). ON DELETE SET NULL: sổ cái tiền
-- không bao giờ mất dòng nào dù AuctionBid phía kia (giả sử) có bị xoá.
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "auctionBidId" TEXT;

DO $$
BEGIN
  ALTER TABLE "WalletTransaction"
    ADD CONSTRAINT "WalletTransaction_auctionBidId_fkey"
    FOREIGN KEY ("auctionBidId") REFERENCES "AuctionBid"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WalletTransaction_auctionBidId_idx" ON "WalletTransaction"("auctionBidId");

-- ============================================================
-- PHẦN F — Đối chiếu nhanh sau khi chạy xong (chỉ SELECT, không đổi gì)
-- Chạy tay để verify — không phải phần bắt buộc của migration.
-- ============================================================
-- SELECT to_regclass('"AuctionSlot"');            -- kỳ vọng NULL (đã xoá)
-- SELECT * FROM "AuctionSetting";                  -- kỳ vọng rỗng (lazy-tạo lúc code chạy)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'WalletTransaction' AND column_name = 'auctionBidId';
