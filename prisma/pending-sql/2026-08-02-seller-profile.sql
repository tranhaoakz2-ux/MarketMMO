-- Hồ sơ cá nhân seller (Trang Bán Hàng > Hồ sơ cá nhân) — "Lĩnh vực chuyên /
-- cam kết dịch vụ", đoạn text ngắn tuỳ chọn seller tự khai để tăng độ tin
-- cậy với buyer. Nullable, migration-safe — mọi seller hiện có specialty=NULL,
-- không hiện gì thêm ở gian hàng công khai cho tới khi tự điền.
--
-- KHÔNG có trường liên hệ cá nhân nào (Facebook/Zalo/Telegram/SĐT/email) —
-- cố ý bỏ để giữ giao dịch trong hệ thống, bảo vệ escrow + phí sàn.
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
