-- Loại hàng mới "TUT-TRICK" (bán nội dung hướng dẫn/kiến thức) — thêm đúng
-- 1 cột mới trên Product + 1 category mặc định để buyer duyệt. productType
-- vẫn là String tự do (không phải enum Postgres, xem quy ước trong
-- CLAUDE.md) nên KHÔNG cần migration riêng để "cho phép" giá trị
-- 'TUT_TRICK' — chỉ cần code (queries.ts/data/products.ts) chấp nhận giá
-- trị mới này.
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

-- 1) Product.tutTrickContent — nội dung hướng dẫn ĐẦY ĐỦ (quy trình/cách
-- làm), CHỈ hiện cho buyer ĐÃ MUA (đọc trực tiếp trong POST /api/checkout để
-- gán vào OrderItem.deliveredPayload — giống hệt cơ chế "kho dữ liệu giao
-- hàng thật" của Sản phẩm kho — KHÔNG BAO GIỜ được thêm vào mapProduct()/
-- Product type public, tránh lộ nội dung trước khi mua qua SSR, cùng
-- nguyên tắc đã áp dụng cho deliveredPayload ở AUDIT LỖ HỔNG 2).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tutTrickContent" TEXT;

-- 2) Category mặc định để buyer duyệt danh mục TUT-Trick ngay từ đầu (không
-- bắt buộc chờ seller tự đề xuất qua luồng "+ Thêm danh mục mới"). Idempotent
-- qua slug unique — bỏ qua nếu đã tồn tại (vd đã tự thêm tay trước đó).
INSERT INTO "Category" (id, slug, name, emoji, status)
SELECT 'cat_tut_trick', 'tut-trick', 'TUT-Trick', '💡', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'tut-trick');

-- Verify sau khi chạy (không bắt buộc, chỉ để đối chiếu):
-- SELECT column_name FROM information_schema.columns WHERE table_name='Product' AND column_name='tutTrickContent';
-- SELECT * FROM "Category" WHERE slug='tut-trick';
