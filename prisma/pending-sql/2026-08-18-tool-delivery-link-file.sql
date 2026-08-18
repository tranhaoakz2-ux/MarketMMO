-- Bổ sung 2 hình thức giao hàng mới cho productType="TOOL" (Tool/AI Agent):
-- giao bằng LINK TẢI và giao bằng FILE UPLOAD (.zip) — bên cạnh "Kho tài
-- khoản tool" (ProductStockItem) đã có, seller dùng kết hợp tự do. 4 cột
-- mới trên Product, KHÔNG bảng mới, KHÔNG đụng ProductStockItem/OrderItem.
--
-- Cả 4 cột đều PRIVATE/gated giống hệt nguyên tắc đã áp dụng cho
-- Product.toolUsageGuide/tutTrickContent: CHỈ đọc trực tiếp trong
-- POST /api/orders/[id]/reveal-delivered SAU KHI buyer đã mua + bấm "Xem",
-- KHÔNG BAO GIỜ đưa vào mapProduct()/Product type public (không lộ ra trang
-- công khai/danh sách/RSC payload). Đọc LIVE từ Product tại thời điểm reveal
-- (không snapshot vào OrderItem) — vì đây là tài nguyên DÙNG CHUNG cho mọi
-- buyer đã mua (không tiêu hao/không giới hạn số lượng bán như kho tài
-- khoản), cùng cách toolUsageGuide đang hoạt động.
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

-- 1) Link tải tool (Google Drive/MediaFire/link riêng...) — seller tự dán,
-- không kiểm nội dung đích (không thể), chỉ validate định dạng URL cơ bản
-- ở tầng API.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolDeliveryLink" TEXT;

-- 2) Đường dẫn lưu trữ NỘI BỘ của file tool đã upload — tiền tố "blob:"+
-- pathname (Blob PRIVATE, tái dùng đúng store riêng tư đã có cho file đính
-- kèm chat, xem src/lib/uploads.ts) hoặc đường dẫn ổ đĩa cục bộ khi dev
-- local. KHÔNG PHẢI URL public, không bao giờ trả thẳng cho client — buyer
-- tải qua route riêng đã xác thực quyền sở hữu đơn hàng.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolFileUrl" TEXT;

-- 3) Tên file gốc seller đặt — hiển thị lại đúng tên khi buyer tải
-- (Content-Disposition) + hiện trước cho buyer biết sắp tải file gì.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolFileName" TEXT;

-- 4) Dung lượng file (byte) — chỉ để hiển thị cho buyer trước khi tải,
-- không dùng tính toán gì khác.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolFileSize" INTEGER;

-- Verify sau khi chạy (không bắt buộc):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='Product' AND column_name IN
--   ('toolDeliveryLink','toolFileUrl','toolFileName','toolFileSize');
