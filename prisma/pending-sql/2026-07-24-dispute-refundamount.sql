-- SECURITY_AUDIT #8 (Phần A) — khiếu nại phân mức.
-- Thêm cột Dispute.refundAmount (nullable) để lưu số tiền thực hoàn cho buyer
-- (full = giá trị dòng; partial = phần %; release/reject = 0).
--
-- Dự án dùng `prisma db push` (không migrations). File này là bản xem trước DDL
-- (sinh bằng `prisma migrate diff`). Đã áp cho DB dev; chạy trên DB production
-- khi deploy. Chỉ THÊM cột nullable, KHÔNG đụng dữ liệu.
--
-- Lưu ý: giá trị BURNED của ProductStockItem.status và RESOLVED_PARTIAL của
-- Dispute.status là chuỗi (String) — KHÔNG cần đổi cột/enum ở DB.

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN "refundAmount" INTEGER;
