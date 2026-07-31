-- Admin tự chọn Sản phẩm nổi bật / Seller nổi bật trên trang chủ (thay vì
-- tự động hoàn toàn như hiện tại). isFeatured=false + featuredOrder=NULL cho
-- mọi bản ghi cũ, migration-safe — không ảnh hưởng gì tới hành vi hiện có
-- cho tới khi admin bắt đầu ghim.
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "featuredOrder" INTEGER;
CREATE INDEX IF NOT EXISTS "Product_isFeatured_featuredOrder_idx" ON "Product" ("isFeatured", "featuredOrder");

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "featuredOrder" INTEGER;
CREATE INDEX IF NOT EXISTS "Seller_isFeatured_featuredOrder_idx" ON "Seller" ("isFeatured", "featuredOrder");
