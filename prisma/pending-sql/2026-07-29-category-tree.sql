-- Cây danh mục động (Category.parentId tự tham chiếu) — cho phép mở rộng
-- vô hạn tầng, thêm nhóm cha/danh mục con MỚI sau này chỉ cần thêm dữ liệu,
-- không cần sửa code. Dự án dùng `prisma db push` (không migrations) — BẠN
-- tự áp file này lên Neon TRƯỚC, sau đó mới sửa schema.prisma + chạy
-- `prisma generate` (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an
-- toàn nhiều lần, TRỪ 2 khối UPDATE gán parentId cho category cũ ở cuối file
-- (chỉ áp dụng cho category CHƯA có parentId — xem ghi chú tại đó).
--
-- KHÔNG đổi slug/tên/emoji/status của bất kỳ category cũ nào, KHÔNG xoá dữ
-- liệu nào.

-- 1) Cột mới trên Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2) Khoá ngoại tự tham chiếu (self-reference). Postgres không hỗ trợ
-- "ADD CONSTRAINT IF NOT EXISTS" nên dùng DO block bắt lỗi "đã tồn tại".
-- ON DELETE SET NULL: xoá 1 nhóm cha KHÔNG kéo xoá category con theo (con
-- chỉ rớt về "chưa có nhóm cha" — việc CHẶN xoá nhóm cha còn con sẽ xử lý ở
-- tầng ứng dụng, Giai đoạn 2, không phải ở DB).
DO $$
BEGIN
  ALTER TABLE "Category"
    ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");

-- 3) 4 nhóm cha ban đầu (top-level, parentId = NULL). sortOrder cách nhau 10
-- để chèn nhóm mới ở giữa sau này không cần renumber toàn bộ.
INSERT INTO "Category" (id, slug, name, emoji, status, "sortOrder", "isActive")
VALUES
  (gen_random_uuid()::text, 'nguyen-lieu',   'Nguyên Liệu',     '📦', 'APPROVED', 10, true),
  (gen_random_uuid()::text, 'dich-vu',       'Dịch Vụ',         '🛠️', 'APPROVED', 20, true),
  (gen_random_uuid()::text, 'ai',            'AI',              '🧠', 'APPROVED', 30, true),
  (gen_random_uuid()::text, 'tool-phan-mem', 'Tool - Phần Mềm', '🧰', 'APPROVED', 40, true)
ON CONFLICT (slug) DO NOTHING;

-- 4) Category con MỚI còn thiếu (theo ví dụ bạn đưa) — gán thẳng parentId
-- qua subquery slug nhóm cha vừa tạo ở bước 3.
INSERT INTO "Category" (id, slug, name, emoji, status, "parentId", "sortOrder", "isActive")
VALUES
  (gen_random_uuid()::text, 'dich-vu-facebook',
    'Dịch Vụ Facebook', '📘', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'dich-vu'), 10, true),
  (gen_random_uuid()::text, 'dich-vu-tiktok',
    'Dịch Vụ TikTok', '🎵', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'dich-vu'), 20, true),
  (gen_random_uuid()::text, 'grok',
    'Grok', '✨', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'ai'), 20, true),
  (gen_random_uuid()::text, 'claude',
    'Claude', '🧩', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'ai'), 30, true),
  (gen_random_uuid()::text, 'tool-danh-gia-google',
    'Tool Đánh Giá Google', '⭐', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'tool-phan-mem'), 10, true),
  (gen_random_uuid()::text, 'tool-tao-video-ngan',
    'Tool Tạo Video Ngắn', '🎬', 'APPROVED',
    (SELECT id FROM "Category" WHERE slug = 'tool-phan-mem'), 20, true)
ON CONFLICT (slug) DO NOTHING;

-- 5) Gán category CŨ vào đúng nhóm cha — CHỈ áp dụng cho category chưa có
-- parentId (AND "parentId" IS NULL) để chạy lại an toàn kể cả SAU KHI admin
-- đã tự sắp xếp lại thủ công qua trang quản trị (Giai đoạn 2) — không đè lên
-- lựa chọn admin đã chỉnh tay.
UPDATE "Category" c SET
  "parentId" = (SELECT id FROM "Category" WHERE slug = 'nguyen-lieu'),
  "sortOrder" = ord.n
FROM (VALUES
  ('gmail', 10), ('facebook', 20), ('outlook', 30), ('tiktok', 40),
  ('twitter', 50), ('steam', 60), ('discord', 70)
) AS ord(slug, n)
WHERE c.slug = ord.slug AND c."parentId" IS NULL;

UPDATE "Category" c SET
  "parentId" = (SELECT id FROM "Category" WHERE slug = 'dich-vu'),
  "sortOrder" = ord.n
FROM (VALUES ('boosting', 30), ('youtube', 40)) AS ord(slug, n)
WHERE c.slug = ord.slug AND c."parentId" IS NULL;

UPDATE "Category" c SET
  "parentId" = (SELECT id FROM "Category" WHERE slug = 'ai'),
  "sortOrder" = ord.n
FROM (VALUES ('chatgpt', 10)) AS ord(slug, n)
WHERE c.slug = ord.slug AND c."parentId" IS NULL;
