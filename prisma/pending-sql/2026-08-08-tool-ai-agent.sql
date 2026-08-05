-- Loại hàng mới "TOOL" (Tool/AI Agent — bán quy trình sử dụng + credential
-- mã hoá, kho kiểu B như Sản phẩm kho) — 3 cột mới, KHÔNG bảng mới.
-- productType vẫn là String tự do (không phải enum Postgres) nên không cần
-- migration riêng để "cho phép" giá trị 'TOOL' — chỉ cần code chấp nhận.
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, xác nhận xong tôi mới sửa schema.prisma + `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

-- 1) Product.toolUsageGuide — quy trình sử dụng ĐẦY ĐỦ, plaintext nhưng
-- PRIVATE/gated (CHỈ đọc trực tiếp trong POST /api/orders/[id]/reveal-delivered
-- sau khi mua — KHÔNG BAO GIỜ đưa vào mapProduct()/Product type public,
-- cùng nguyên tắc đã áp dụng cho Product.tutTrickContent).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolUsageGuide" TEXT;

-- 2) ProductStockItem.contentEncryption — JSON {iv, authTag, keyVersion} khi
-- "content" là ciphertext AES-256-GCM (chỉ áp dụng cho kho của sản phẩm
-- TOOL, mã hoá bằng SERVICE_CREDENTIAL_ENCRYPTION_KEY, tái dùng
-- src/lib/service-crypto.ts). NULL = "content" vẫn plaintext như trước —
-- KHÔNG đụng tới bất kỳ dòng kho hiện có nào (Sản phẩm kho/TUT-Trick không
-- liên quan cột này).
ALTER TABLE "ProductStockItem" ADD COLUMN IF NOT EXISTS "contentEncryption" TEXT;

-- 3) OrderItem.deliveredPayloadEncryption — JSON MẢNG {iv,authTag,keyVersion}
-- | null, CÙNG THỨ TỰ INDEX với deliveredPayload (hỗ trợ mua nhiều đơn vị
-- TOOL cùng lúc, mỗi đơn vị 1 credential mã hoá riêng). NULL = deliveredPayload
-- vẫn hoàn toàn plaintext như trước (Sản phẩm kho/TUT-Trick/Dịch vụ không
-- đụng cột này, 0 rủi ro hồi tố).
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "deliveredPayloadEncryption" TEXT;

-- 4) Category mặc định để buyer duyệt ngay (cùng pattern TUT-Trick).
INSERT INTO "Category" (id, slug, name, emoji, status)
SELECT 'cat_tool_ai_agent', 'tool-ai-agent', 'Tool / AI Agent', '🛠️', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'tool-ai-agent');

-- Verify sau khi chạy (không bắt buộc):
-- SELECT column_name FROM information_schema.columns WHERE table_name='Product' AND column_name='toolUsageGuide';
-- SELECT column_name FROM information_schema.columns WHERE table_name='ProductStockItem' AND column_name='contentEncryption';
-- SELECT column_name FROM information_schema.columns WHERE table_name='OrderItem' AND column_name='deliveredPayloadEncryption';
-- SELECT * FROM "Category" WHERE slug='tool-ai-agent';
