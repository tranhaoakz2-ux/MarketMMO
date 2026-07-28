-- Cho phép admin ẩn 1 review (spam/xúc phạm) mà không xoá cứng — cùng
-- pattern ForumPost.hidden đã có. Idempotent.
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;
