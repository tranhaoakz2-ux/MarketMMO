-- SECURITY_AUDIT #8 (Phần B) — bắt buộc bảo hành seller 24h trước khi escalate.
-- Thêm 3 cột vào Dispute:
--   phase (NOT NULL DEFAULT 'PLATFORM') — pha xử lý; default PLATFORM để mọi
--     dispute CŨ giữ nguyên hành vi admin-thấy (migration-safe). Dispute buyer
--     mở mới sẽ set 'SELLER_WARRANTY' ở tầng ứng dụng.
--   warrantyDeadline (nullable) — hạn seller tự bảo hành.
--   warrantyRejectedAt (nullable) — thời điểm seller từ chối bảo hành.
--
-- Dự án dùng `prisma db push` (không migrations). Đã áp cho DB dev; chạy trên
-- DB production khi deploy. Chỉ THÊM cột, KHÔNG đụng dữ liệu.

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN "phase" TEXT NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN "warrantyDeadline" TIMESTAMP(3),
ADD COLUMN "warrantyRejectedAt" TIMESTAMP(3);
