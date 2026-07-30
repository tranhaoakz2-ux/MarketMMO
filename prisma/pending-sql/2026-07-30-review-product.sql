-- Việc 1 — Hợp nhất rating sản phẩm về đánh giá THẬT của buyer (thay vì số
-- tĩnh Product.rating/reviewCount từ seed). Thêm Review.productId (nullable)
-- để 1 review có thể gắn với đúng sản phẩm buyer đã mua và đánh giá — review
-- cũ/review không chọn sản phẩm cụ thể giữ NULL, vẫn tính vào rating gian
-- hàng (Seller) nhưng không tính vào rating sản phẩm nào.
--
-- KHÔNG đổi @@unique([sellerId, userId]) hiện có — giữ nguyên hành vi "1
-- buyer chỉ đánh giá 1 lần/gian hàng". Idempotent — chạy lại an toàn.

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "productId" TEXT
  REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");
