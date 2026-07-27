-- Thời hạn sử dụng sản phẩm (subscription/timed goods).
-- ProductStockItem.expiresAt: ngày hết hạn của TỪNG đơn vị kho (null = không
-- thời hạn, vd Gmail — giữ nguyên hành vi bán giá cố định như trước).
-- ProductStockItem.nominalTermDays: số ngày của gói ĐẦY ĐỦ mà đơn vị đó
-- thuộc về (vd 30 cho "1 tháng") — chỉ dùng làm mẫu số tính % ngày còn lại
-- để prorate giá lúc checkout (xem src/lib/prorate.ts).
-- OrderItem.deliveredExpiresAt: snapshot ngày hết hạn của (các) đơn vị đã
-- giao cho dòng hàng, JSON mảng cùng cấu trúc/thứ tự với deliveredPayload.
--
-- Dự án dùng `prisma db push` (không migrations). Đã áp cho DB DEV; file này
-- để BẠN TỰ áp lên DB PRODUCTION. Idempotent — chạy lại an toàn. Toàn bộ cột
-- mới mặc định NULL nên không đụng dữ liệu cũ — 180+ sản phẩm/đơn hàng hiện
-- có tiếp tục hoạt động y hệt trước (không thời hạn, giá cố định).

ALTER TABLE "ProductStockItem" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "ProductStockItem" ADD COLUMN IF NOT EXISTS "nominalTermDays" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "deliveredExpiresAt" TEXT;
