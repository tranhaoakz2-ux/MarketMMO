-- Nghiệp vụ "Dịch vụ" — Product.productType + cấu hình bàn giao/cửa sổ xem
-- credential, ServiceFieldDefinition (seller khai field buyer phải nhập),
-- ServiceIntake (dữ liệu buyer cung cấp, field nhạy cảm mã hoá AES-256-GCM),
-- ServiceCredentialAccessLog (audit seller xem credential lúc nào).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, sau đó Claude mới sửa schema.prisma + chạy `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn, không đụng
-- dữ liệu hiện có (mọi cột mới đều nullable hoặc có default an toàn).

-- 1) Product: phân loại + cấu hình dịch vụ
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productType" TEXT NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "serviceDeliveryMethods" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "credentialViewWindowHours" INTEGER;

-- Backfill: giữ đúng ý nghĩa heuristic SERVICE_CATEGORY_SLUGS cũ
-- (boosting/chatgpt/youtube) — chỉ set những sản phẩm còn ở default
-- 'PRODUCT', an toàn để chạy lại nhiều lần.
UPDATE "Product" p SET "productType" = 'SERVICE'
FROM "Category" c
WHERE p."categoryId" = c."id" AND c."slug" IN ('boosting', 'chatgpt', 'youtube')
  AND p."productType" = 'PRODUCT';

-- 2) ServiceFieldDefinition — seller khai field buyer phải nhập cho 1 dịch vụ
CREATE TABLE IF NOT EXISTS "ServiceFieldDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "inputType" TEXT NOT NULL DEFAULT 'text',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ServiceFieldDefinition_productId_idx" ON "ServiceFieldDefinition"("productId");

-- 3) ServiceIntake — dữ liệu buyer cung cấp cho 1 đơn dịch vụ, 1-1 với OrderItem
CREATE TABLE IF NOT EXISTS "ServiceIntake" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderItemId" TEXT NOT NULL UNIQUE REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "deliveryMethod" TEXT NOT NULL,
  "publicFields" TEXT,
  "encryptedFields" TEXT,
  "encryptionIv" TEXT,
  "encryptionAuthTag" TEXT,
  "encryptionKeyVersion" INTEGER,
  "preHandoffSnapshot" TEXT,
  "sellerAcceptedAt" TIMESTAMP(3),
  "sensitiveRevealDeadline" TIMESTAMP(3),
  "sensitivePurgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) ServiceCredentialAccessLog — audit: seller nào xem credential, lúc nào
CREATE TABLE IF NOT EXISTS "ServiceCredentialAccessLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceIntakeId" TEXT NOT NULL REFERENCES "ServiceIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT
);
CREATE INDEX IF NOT EXISTS "ServiceCredentialAccessLog_serviceIntakeId_idx" ON "ServiceCredentialAccessLog"("serviceIntakeId");
CREATE INDEX IF NOT EXISTS "ServiceCredentialAccessLog_sellerId_idx" ON "ServiceCredentialAccessLog"("sellerId");
