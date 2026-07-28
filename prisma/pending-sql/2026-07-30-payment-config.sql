-- Cấu hình thanh toán (VNPay/USDT/Ngân hàng) quản lý qua Admin thay vì chỉ
-- .env — bảng key-value đơn giản, mỗi dòng ghi đè đúng 1 biến môi trường
-- tương ứng. THIẾU dòng (hoặc value NULL/rỗng) = hệ thống tự dùng giá trị
-- .env hiện tại làm fallback — không phá vỡ cấu hình VNPay/USDT/ngân hàng
-- đã set qua .env từ trước, chỉ khi admin chủ động lưu qua /admin/cai-dat
-- mới ghi đè. Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS "PaymentConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);
