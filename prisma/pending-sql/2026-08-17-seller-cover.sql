-- Ảnh bìa (cover) gian hàng — hiển thị ở card trang /nguoi-ban (danh sách
-- người bán) và làm nền dải header trang /shop/[seller]. Cùng pattern với
-- Seller.avatarUrl (nullable, null = chưa upload, UI tự fallback về nền mặc
-- định đẹp thay vì để trống trơn).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, sau đó báo lại để tôi sync schema.prisma + `npx prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
