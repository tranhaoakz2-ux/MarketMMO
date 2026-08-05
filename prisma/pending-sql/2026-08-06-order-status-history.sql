-- AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 3: lịch sử đổi trạng thái đơn (append-only,
-- fromStatus→toStatus, actor, thời gian) — mỗi dòng hàng (OrderItem) có 1
-- chuỗi lịch sử riêng vì mỗi dòng có thể thuộc seller khác nhau, trạng thái
-- khác nhau (đúng khớp cách OrderItem.status đã được thiết kế từ đầu).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fromStatus"  TEXT,
  "toStatus"    TEXT NOT NULL,
  "actorType"   TEXT NOT NULL,
  "actorId"     TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderItemId_idx" ON "OrderStatusHistory"("orderItemId");
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_actorId_idx" ON "OrderStatusHistory"("actorId");

-- Backfill CÓ GIỚI HẠN, không đoán bừa: CHỈ tạo dòng "khởi tạo" (null→ESCROW)
-- cho các OrderItem đã có từ trước — đây là sự thật 100% suy ra được từ chính
-- code (MỌI OrderItem đều được tạo với status="ESCROW", buyer = Order.buyerId,
-- không có ngoại lệ nào trong toàn bộ codebase). KHÔNG cố tái tạo các bước
-- chuyển tiếp theo sau (ESCROW→RELEASED/CANCELLED/DISPUTED) cho đơn cũ vì
-- KHÔNG có cách nào xác định chắc chắn AI đã thực hiện hay CHÍNH XÁC lúc nào
-- (releasedAt cũng đã cố tình không backfill cho đơn cũ vì cùng lý do — xem
-- ghi chú OrderItem.releasedAt trong schema.prisma) — để trống, không đoán.
-- Từ thời điểm chạy file này trở đi, MỌI thay đổi trạng thái đều được ghi lại
-- đầy đủ và chính xác qua code mới.
INSERT INTO "OrderStatusHistory" (id, "orderItemId", "fromStatus", "toStatus", "actorType", "actorId", note, "createdAt")
SELECT
  'bkf_' || oi.id,
  oi.id,
  NULL,
  'ESCROW',
  'BUYER',
  o."buyerId",
  'Backfill — suy ra từ dữ liệu gốc: mọi đơn đều bắt đầu ở trạng thái ESCROW lúc tạo.',
  oi."createdAt"
FROM "OrderItem" oi
JOIN "Order" o ON o.id = oi."orderId"
WHERE NOT EXISTS (
  SELECT 1 FROM "OrderStatusHistory" h WHERE h.id = 'bkf_' || oi.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify sau khi chạy (không bắt buộc, chỉ để đối chiếu):
-- SELECT COUNT(*) FROM "OrderStatusHistory"; -- phải = số OrderItem hiện có
-- SELECT COUNT(*) FROM "OrderItem"; -- đối chiếu với dòng trên
