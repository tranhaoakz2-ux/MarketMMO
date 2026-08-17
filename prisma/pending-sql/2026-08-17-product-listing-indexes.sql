-- Index phục vụ lọc/sắp xếp cho MỌI trang listing công khai (trang chủ,
-- danh mục, tìm kiếm, gian hàng) — xem PERFORMANCE_AUDIT.md mục 2. status +
-- isActive luôn xuất hiện CÙNG NHAU trong where của mọi query công khai nên
-- gộp composite thay vì 3 index đơn lẻ.
--
-- Dự án dùng `prisma db push` (không migrations) — ĐÃ CHẠY THỦ CÔNG trên
-- Neon (2026-08-17), sau đó @@index tương ứng đã thêm vào schema.prisma +
-- chạy `npx prisma generate` (KHÔNG db push) để Prisma Client biết index đã
-- tồn tại mà không đụng lại DB. Giữ file này lại làm hồ sơ đã áp dụng gì.

CREATE INDEX IF NOT EXISTS "Product_status_isActive_categoryId_idx"
  ON "Product" ("status", "isActive", "categoryId");

CREATE INDEX IF NOT EXISTS "Product_status_isActive_createdAt_idx"
  ON "Product" ("status", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Product_status_isActive_sold_idx"
  ON "Product" ("status", "isActive", "sold" DESC);

CREATE INDEX IF NOT EXISTS "Seller_suspended_idx"
  ON "Seller" ("suspended");
