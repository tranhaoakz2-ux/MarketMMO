-- Giao hàng thủ công theo đơn (manual provisioning) cho sản phẩm VPS/Server,
-- song song với "kho dữ liệu text" (AUTO_STOCK) hiện có. KHÔNG dùng enum
-- Postgres cho deliveryMethod/kind/billingCycle (đúng quy ước dự án — dự án
-- dùng `prisma db push`, không có thư mục migrations, đổi enum native cần
-- ALTER TYPE không hợp workflow) — union type khai ở src/lib/constants.ts.
-- osOptions lưu JSON-string (đúng quy ước dự án, xem Product.attributes),
-- KHÔNG dùng Postgres String[].
--
-- An toàn giải ngân (đã grep xác nhận trước khi viết file này, xem
-- src/lib/escrow.ts dòng 39-59 + src/lib/constants.ts MIN_WARRANTY_HOURS_PRODUCT):
-- đơn MANUAL_PROVISION vẫn productType="PRODUCT" nên bị ép bảo hành tối
-- thiểu 24h (không "bán đứt" được) — lưới an toàn auto-confirm trong
-- releaseDueEscrow() luôn kích hoạt nếu buyer quên bấm xác nhận, đảm bảo
-- escrow không bao giờ giải ngân trước khi hết cửa sổ bảo hành thật.
--
-- Migration-safe: default AUTO_STOCK giữ nguyên hành vi mọi sản phẩm cũ.
-- Idempotent — chạy lại an toàn. BẠN tự áp file này lên Neon TRƯỚC, sau đó
-- Claude mới sửa schema.prisma + chạy `prisma generate` (KHÔNG `db push`/
-- `migrate` nhắm production).

-- 1) Product: phương thức giao hàng
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT NOT NULL DEFAULT 'AUTO_STOCK';

-- 2) ServerDetail — spec VPS/Dedicated, 1-1 với Product (chỉ có ý nghĩa khi
-- deliveryMethod='MANUAL_PROVISION'; chưa cho sửa sau khi tạo ở v1 này, xem
-- kế hoạch đã duyệt).
CREATE TABLE IF NOT EXISTS "ServerDetail" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL UNIQUE REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL DEFAULT 'VPS',
  "cpuCores" INTEGER,
  "ramGb" INTEGER,
  "storageGb" INTEGER,
  "storageType" TEXT,
  "bandwidth" TEXT,
  "osOptions" TEXT,
  "location" TEXT,
  "billingCycle" TEXT NOT NULL DEFAULT 'ONE_TIME',
  "uptimeSla" TEXT,
  -- SLA seller phải nhập credential trong vòng bao nhiêu giờ sau thanh toán;
  -- validate >=1 ở API, DEFAULT chỉ là an toàn tầng DB.
  "provisionSlaHours" INTEGER NOT NULL DEFAULT 24,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) OrderItem: hạn giao thủ công riêng — KHÔNG tái dùng "deliveryDeadline"
-- hiện có (cột đó là của pre-order, quyết định build tách theo yêu cầu) —
-- escrowReleaseAt lúc checkout sẽ set = manualDeliveryDeadline (mirror đúng
-- cách pre-order làm ở POST /api/checkout, xem comment ở trên).
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "manualDeliveryDeadline" TIMESTAMP(3);
