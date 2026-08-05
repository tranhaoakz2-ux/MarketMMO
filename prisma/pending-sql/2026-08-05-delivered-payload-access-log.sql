-- AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 2: ghi nhận buyer đã xem/nhận nội dung
-- giao hàng (OrderItem.deliveredPayload) — mirror ServiceCredentialAccessLog
-- (đã có sẵn cho chiều seller xem dữ liệu buyer cung cấp), chiều ngược lại.
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn, không có gì để
-- backfill (bảng mới hoàn toàn, không có dữ liệu lịch sử để suy luận —
-- KHÔNG đoán bừa các lượt xem đã xảy ra trước khi có tính năng này).

CREATE TABLE IF NOT EXISTS "DeliveredPayloadAccessLog" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "buyerId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "viewedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress"   TEXT
);

CREATE INDEX IF NOT EXISTS "DeliveredPayloadAccessLog_orderItemId_idx" ON "DeliveredPayloadAccessLog"("orderItemId");
CREATE INDEX IF NOT EXISTS "DeliveredPayloadAccessLog_buyerId_idx" ON "DeliveredPayloadAccessLog"("buyerId");

-- Verify sau khi chạy (không bắt buộc, chỉ để đối chiếu):
-- SELECT COUNT(*) FROM "DeliveredPayloadAccessLog"; -- phải = 0 (bảng mới)
