-- Phần 1 — Rút USDT (TRC20) cho seller. Thêm 4 cột nullable vào
-- WalletTransaction để lưu thông tin rút USDT (khoá tỷ giá tại thời điểm
-- tạo yêu cầu, địa chỉ ví TRC20 đích) — migration-safe, không đụng dữ liệu
-- cũ (mọi dòng WalletTransaction hiện có giữ nguyên 4 cột này = NULL,
-- hành vi rút tiền ngân hàng hiện tại không đổi gì).
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "withdrawAddress" TEXT;
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "usdtAmount" DOUBLE PRECISION;
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "rateSource" TEXT;
