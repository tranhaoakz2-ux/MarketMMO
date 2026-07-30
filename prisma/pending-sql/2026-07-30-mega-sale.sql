-- Mega Sale — seller tự bật/tắt khuyến mãi cho SẢN PHẨM (không phải từng
-- variant riêng — kiểu % áp đồng loạt lên price/priceMax/mọi variant.price
-- của sản phẩm, kiểu giá trực tiếp chỉ cho sản phẩm giá đơn thật sự).
-- Không giới hạn cấu trúc CSDL nào ép % giảm — seller toàn quyền, chỉ chặn
-- ở tầng API (1-99%) để tránh giá về 0/âm, dùng chung sàn
-- MIN_ITEM_PRICE_AFTER_DISCOUNT (1.000đ) đã có sẵn trong hệ thống.
--
-- Cơ chế hết hạn (megaSaleEndsAt) tính REAL-TIME lúc đọc (không cron) — xem
-- computeEffectivePrice() trong src/lib/mega-sale.ts. Idempotent — chạy lại
-- an toàn. Migration-safe: mọi cột optional/có default, 180+ sản phẩm cũ
-- không bị ảnh hưởng.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "megaSaleActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "megaSaleType" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "megaSalePercent" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "megaSaleFixedPrice" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "megaSaleEndsAt" TIMESTAMP(3);
