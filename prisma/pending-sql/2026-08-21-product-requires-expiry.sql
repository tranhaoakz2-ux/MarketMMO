-- "Tài khoản AI" (ChatGPT Plus, Grok...) tách ra thành 1 ô chọn riêng ở form
-- đăng sản phẩm, ngang hàng Sản phẩm/VPS/Dịch vụ/TUT-Trick/TOOL — nhưng
-- KHÔNG phải productType mới: vẫn productType="PRODUCT" + deliveryMethod=
-- "AUTO_STOCK" y hệt Sản phẩm thường (giữ nguyên 100% logic giao hàng/
-- checkout/escrow/prorate đã có, xem src/lib/prorate.ts).
--
-- Product.requiresExpiryStock: cờ duy nhất seller bật khi chọn "Tài khoản
-- AI" lúc tạo sản phẩm. Khi true, POST /api/seller/products/[productId]/stock
-- (điểm chung DUY NHẤT mọi lối nhập kho đi qua — cả form đăng lẫn
-- ProductVariantManager) BẮT BUỘC mọi dòng kho seller nhập SAU NÀY phải có
-- ngày hết hạn (expiresAt) + nominalTermDays hợp lệ, không cho bỏ trống —
-- chốt chặn thật ở server, không chỉ ẩn checkbox ở UI.
--
-- Dự án dùng `prisma db push` (không migrations). File này để BẠN TỰ áp lên
-- Neon (production) — TÔI KHÔNG tự chạy. Idempotent — chạy lại an toàn. Cột
-- mới mặc định false nên không đụng 180+ sản phẩm hiện có (tiếp tục hoạt
-- động y hệt trước — "Sản phẩm" thường không bị ép thời hạn).

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "requiresExpiryStock" BOOLEAN NOT NULL DEFAULT false;
