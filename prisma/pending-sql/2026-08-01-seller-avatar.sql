-- Seller tự đổi avatar (ảnh đại diện gian hàng). Nullable, migration-safe —
-- mọi seller hiện có avatarUrl=NULL, tự fallback về giao diện cũ (chữ cái
-- đầu tên shop / icon Store tuỳ nơi) cho tới khi tự upload.
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
