-- AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 1: nối tiền với đơn bằng khoá cứng + mã
-- đơn dễ đọc (xem PROJECT_MAP.md, mục "AUDIT — Lịch sử đơn hàng...").
--
-- Trước đây WalletTransaction chỉ nối với Order/OrderItem qua chuỗi tự do
-- trong cột `note` (vd "Thanh toán đơn hàng #<id>") — không phải khoá ngoại,
-- không JOIN được, không đáng tin cậy làm bằng chứng phân xử. File này thêm
-- khoá ngoại thật + backfill CÓ KIỂM CHỨNG (chỉ set khi khớp chính xác với
-- Order/OrderItem có thật trong DB — KHÔNG đoán bừa, không khớp thì để NULL).
--
-- orderCode là mã hiển thị/tra cứu (KHÔNG thay id nội bộ — id ngẫu nhiên vẫn
-- là khoá chính, giữ nguyên vì lý do bảo mật: mã dễ đọc mà đoán được thì
-- không nên làm khoá chính).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, verify xong báo lại, tôi mới sửa schema.prisma + generate.
-- Idempotent — chạy lại an toàn (kể cả 2 khối UPDATE backfill: chỉ động vào
-- dòng đang NULL, chạy lại không đổi gì thêm).

-- ============================================================
-- PHẦN A — Order.orderCode (mã đơn dễ đọc, duy nhất)
-- ============================================================

-- 1) Cột mới, nullable trước (bắt buộc NOT NULL sau khi đã backfill xong ở dưới).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderCode" TEXT;

-- 2) Backfill mã cho MỌI đơn cũ đang thiếu — dạng "DH-XXXXXX" (6 ký tự từ
-- md5 băm id + thời điểm chạy + random, in hoa). Đây là SINH MÃ MỚI cho đơn
-- chưa từng có mã (không phải suy đoán dữ liệu cũ — mã cũ không tồn tại).
-- Xác suất trùng cực thấp ở quy mô dữ liệu hiện tại; bước 3 (UNIQUE INDEX)
-- sẽ tự báo lỗi rõ ràng nếu có trùng thật, không âm thầm bỏ qua.
UPDATE "Order"
SET "orderCode" = 'DH-' || upper(substr(md5(id || clock_timestamp()::text || random()::text), 1, 6))
WHERE "orderCode" IS NULL;

-- 3) Bắt buộc NOT NULL + UNIQUE sau khi đã backfill đủ 100% dòng.
ALTER TABLE "Order" ALTER COLUMN "orderCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderCode_key" ON "Order"("orderCode");

-- ============================================================
-- PHẦN B — WalletTransaction.orderId / orderItemId (khoá ngoại thật)
-- ============================================================

-- 1) Cột mới, nullable (DEPOSIT/WITHDRAW không liên quan đơn hàng nào — giữ
-- NULL vĩnh viễn cho các dòng đó, không bắt buộc).
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "orderItemId" TEXT;

-- 2) Khoá ngoại — ON DELETE SET NULL (không Cascade): dù hiện tại KHÔNG có
-- route nào xoá Order/OrderItem (đã xác nhận khi audit), vẫn chọn SET NULL
-- làm lớp phòng thủ — WalletTransaction là sổ cái, tuyệt đối không được mất
-- dòng nào dù Order phía kia có bị xoá trong tương lai. Postgres không hỗ
-- trợ "ADD CONSTRAINT IF NOT EXISTS" nên dùng DO block bắt lỗi "đã tồn tại"
-- (cùng idiom đã dùng ở 2026-07-29-category-tree.sql).
DO $$
BEGIN
  ALTER TABLE "WalletTransaction"
    ADD CONSTRAINT "WalletTransaction_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "WalletTransaction"
    ADD CONSTRAINT "WalletTransaction_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WalletTransaction_orderId_idx" ON "WalletTransaction"("orderId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_orderItemId_idx" ON "WalletTransaction"("orderItemId");

-- 3) Backfill orderId cho giao dịch CŨ — CHỈ set khi trích được đúng 1 Order
-- id có thật từ note (regex khớp cả 2 dạng "đơn #<id>" và "đơn hàng #<id>"
-- đang dùng trong code hiện tại), qua JOIN đối chiếu trực tiếp với bảng
-- Order — không khớp/không tồn tại thì GIỮ NGUYÊN NULL, không đoán bừa.
UPDATE "WalletTransaction" wt
SET "orderId" = o.id
FROM "Order" o
WHERE wt."orderId" IS NULL
  AND wt.note IS NOT NULL
  AND o.id = substring(wt.note from 'đơn(?: hàng)? #([a-zA-Z0-9]+)');

-- 4) Backfill orderItemId — CHỈ cho đơn có ĐÚNG 1 OrderItem (trường hợp
-- không mơ hồ). Đơn có nhiều dòng hàng thì note không đủ thông tin để biết
-- chắc chắn dòng nào — giữ NULL, không đoán bừa theo tên sản phẩm (có thể
-- trùng/không khớp chính xác).
UPDATE "WalletTransaction" wt
SET "orderItemId" = oi.id
FROM "OrderItem" oi
WHERE wt."orderId" = oi."orderId"
  AND wt."orderItemId" IS NULL
  AND (SELECT COUNT(*) FROM "OrderItem" oi2 WHERE oi2."orderId" = wt."orderId") = 1;

-- ============================================================
-- PHẦN C — Đối chiếu nhanh sau khi chạy xong (chỉ SELECT, không đổi gì)
-- Chạy tay để verify — không phải phần bắt buộc của migration.
-- ============================================================
-- SELECT COUNT(*) AS total_orders, COUNT(DISTINCT "orderCode") AS distinct_codes FROM "Order";
-- SELECT type, COUNT(*) AS total, COUNT("orderId") AS linked FROM "WalletTransaction" GROUP BY type ORDER BY type;
