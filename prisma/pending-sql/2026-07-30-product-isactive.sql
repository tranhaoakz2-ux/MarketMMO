-- Cho phép admin ẩn/hiện 1 sản phẩm đang sống trên sàn, tách biệt khỏi
-- status (luồng duyệt đăng mới) — cùng pattern Category.isActive đã có.
-- Idempotent, không đổi/xoá dữ liệu nào.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
