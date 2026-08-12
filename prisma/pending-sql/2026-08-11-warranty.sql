-- Thời gian bảo hành (warranty) — cơ chế nền tảng cho hệ thống khiếu nại:
-- buyer chỉ khiếu nại được trong thời gian bảo hành (áp dụng cho pha
-- POST_RELEASE_WARRANTY — bảo hành SAU KHI đơn đã giải ngân; pha ESCROW
-- "báo hàng sai/chưa giao" KHÔNG bị ảnh hưởng, luôn khả dụng bất kể cấu
-- hình bảo hành, theo yêu cầu đã chốt).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

-- 1) Product: seller khai bảo hành lúc đăng sản phẩm (mọi loại hàng —
-- Sản phẩm/Dịch vụ/TUT-Trick/Tool). value=0 = "Không bảo hành (bán đứt)".
-- Default 0/'day' cho sản phẩm cũ — KHÔNG hồi tố ý nghĩa gì (sản phẩm cũ
-- coi như "chưa khai báo bảo hành" cho tới khi seller cập nhật).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "warrantyValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "warrantyUnit" TEXT NOT NULL DEFAULT 'day';

-- 2) OrderItem: SNAPSHOT bảo hành tại thời điểm mua (chống seller sửa sản
-- phẩm sau khi bán để cướp quyền khiếu nại buyer) + mốc buyer xác nhận đã
-- nhận hàng + hạn bảo hành tính sẵn từ mốc đó.
--
-- warrantyHours CỐ TÌNH NULLABLE (không default 0) — đây là điểm mấu chốt
-- để phân biệt "đơn TỪ TRƯỚC tính năng này" (NULL) với "đơn mới, seller
-- chọn bán đứt 0 giờ" (0 thật). Đơn NULL tiếp tục dùng luật CŨ (7 ngày kể
-- từ releasedAt, xem POST_RELEASE_WARRANTY_DAYS) làm dự phòng vĩnh viễn —
-- không đơn cũ nào bị mất quyền khiếu nại đang có khi tính năng này triển
-- khai. Đơn mới luôn có giá trị thật (>=0) ngay lúc checkout.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "warrantyHours" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "warrantyExpiresAt" TIMESTAMP(3);

-- Verify sau khi chạy (không bắt buộc):
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
--   WHERE table_name='Product' AND column_name IN ('warrantyValue','warrantyUnit');
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name='OrderItem' AND column_name IN ('warrantyHours','receivedAt','warrantyExpiresAt');
