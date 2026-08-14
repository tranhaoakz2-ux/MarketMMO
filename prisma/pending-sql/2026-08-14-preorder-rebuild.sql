-- Xây lại hoàn chỉnh cơ chế "Đặt trước" (pre-order) — Product.preOrderDeliveryValue/
-- preOrderDeliveryUnit (thời gian giao seller cam kết), OrderItem.isPreOrder/
-- deliveryDeadline (snapshot lúc mua, chống seller sửa Product.preOrder/thời gian
-- giao SAU khi bán để né job chặn/hoàn tiền).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên Neon
-- TRƯỚC, sau đó báo lại để tôi sync schema.prisma + `npx prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.
--
-- isPreOrder mặc định false, deliveryDeadline mặc định NULL — migration-safe:
-- đơn đặt trước cũ (nếu có, tạo trước tính năng này) giữ isPreOrder=false, đi
-- theo luật cũ (KHÔNG retroactive) — quyết định (A1) đã chốt với người dùng.

-- 1) Product: thời gian giao hàng cam kết cho sản phẩm đang bật "Đặt trước".
-- Nullable — null khi preOrder=false hoặc seller chưa cấu hình.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preOrderDeliveryValue" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preOrderDeliveryUnit" TEXT NOT NULL DEFAULT 'day';

-- 2) OrderItem: SNAPSHOT lúc mua.
-- isPreOrder ĐÓNG BĂNG việc đơn này là đặt trước tại thời điểm mua — job
-- giải ngân/hoàn tiền lọc theo cột NÀY, KHÔNG join ngược Product (Product.preOrder
-- có thể bị seller đổi sau khi bán).
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "isPreOrder" BOOLEAN NOT NULL DEFAULT false;
-- deliveryDeadline = thời điểm mua + thời gian giao đã snapshot. Mốc auto-hoàn
-- tiền nếu seller chưa giao (deliveredPayload vẫn NULL) khi quá hạn này.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "deliveryDeadline" TIMESTAMP(3);
