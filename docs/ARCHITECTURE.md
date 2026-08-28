# ARCHITECTURE.md — Cách MarketMMO vận hành thật

> Tài liệu này mô tả **cách các hệ thống chính hoạt động** trong code hiện tại
> — viết từ việc đọc trực tiếp source code (không suy đoán). Mục tiêu: một
> phiên Claude Code mới đọc file này là hiểu ngay luồng nghiệp vụ, không cần
> dò lại từ đầu. Khi sửa logic một hệ thống, cập nhật lại đúng mục tương ứng.
>
> Xem `CLAUDE.md` để biết tech stack/cấu trúc thư mục/quy ước code/quy trình
> làm việc. File này chỉ tập trung vào **luồng nghiệp vụ** (business logic).
>
> Quy ước đọc nhanh: mọi trạng thái (`status`, `type`...) là cột Postgres
> kiểu `String` tự do, KHÔNG phải enum native — union type TypeScript tương
> ứng khai báo tập trung ở `src/lib/constants.ts`. Mọi thao tác đổi
> tiền/tồn kho đều bọc trong `prisma.$transaction`, và các bước "trừ có điều
> kiện" luôn dùng `updateMany({where: {..., đủ điều kiện}})` rồi kiểm
> `count === 0` để phát hiện race condition — pattern này lặp lại xuyên suốt
> toàn bộ tài liệu, không nhắc lại ở từng mục.

## Mục lục

1. [Xác thực & phân quyền](#1-xác-thực--phân-quyền)
2. [Giỏ hàng → Thanh toán → Escrow](#2-giỏ-hàng--thanh-toán--escrow-postapicheckout)
3. [4 loại sản phẩm & cách giao hàng](#3-4-loại-sản-phẩm--cách-giao-hàng)
4. [Cơ chế "lộ hàng" (reveal-delivered)](#4-cơ-chế-lộ-hàng-reveal-delivered)
5. [Bảo hành](#5-bảo-hành)
6. [Giải ngân escrow & CRON](#6-giải-ngân-escrow--cron)
7. [Đặt trước (Pre-order)](#7-đặt-trước-pre-order)
8. [Khiếu nại (Dispute)](#8-khiếu-nại-dispute)
9. [Rút tiền](#9-rút-tiền)
10. [Đấu giá vị trí vàng](#10-đấu-giá-vị-trí-vàng)
11. [Nạp tiền — VNPay / SePay / USDT / Bank thủ công](#11-nạp-tiền--vnpay--sepay--usdt--bank-thủ-công)
12. [Phí sàn & Hoa hồng giới thiệu (Affiliate)](#12-phí-sàn--hoa-hồng-giới-thiệu-affiliate)
13. [Diễn đàn, Đánh giá, Hồ sơ gian hàng, Mega Sale, Nội dung trang chủ](#13-diễn-đàn-đánh-giá-hồ-sơ-gian-hàng-mega-sale-nội-dung-trang-chủ)
14. [Admin Control Center & kiểm duyệt](#14-admin-control-center--kiểm-duyệt)
15. [SEO, phân trang, index DB](#15-seo-phân-trang-index-db)
16. [Lịch sử tiến hoá schema (pending-sql)](#16-lịch-sử-tiến-hoá-schema-pending-sql)

---

## 1. Xác thực & phân quyền

### Đăng nhập/đăng ký — `src/auth.ts`

- **Credentials provider**: đăng nhập bằng email HOẶC username (field wire vẫn
  tên `email`, `authorize()` tra `OR:[{email},{username}]`). Thứ tự kiểm tra:
  rate-limit theo IP (30/15p) + theo tài khoản (10/15p) → verify Turnstile →
  tìm user → so khớp bcrypt → chặn `banned`. 3 lớp lỗi custom kế thừa
  `CredentialsSignin`: `TurnstileSignin`, `BannedSignin`, `RateLimitSignin`
  (client phân biệt qua field `code`).
- **Google OAuth**: chỉ bật khi có `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.
- **Turnstile** (`src/lib/turnstile.ts`): fail-closed ở production (thiếu key
  → verify luôn `false`), fail-open ở dev/test (thiếu key → `true`).
- **Session**: `strategy: "jwt"`. Callback `jwt()` refresh **role/walletBalance/
  banned từ DB mỗi request** khi đã có `token.id` — đây là lý do admin ban
  tài khoản/đổi role có hiệu lực gần như ngay lập tức mà không cần user đăng
  nhập lại (chỉ chờ tới request kế tiếp). Đồng thời throttle ghi
  `lastActiveAt` (chỉ ghi nếu đã quá 2 phút từ lần trước) dùng cho "Online X
  trước".
- **Đăng ký** (`POST /api/auth/register`): rate-limit IP 10/giờ, validate
  username/email/password, verify Turnstile, xử lý `refCode` (gắn
  `referredById`, KHÔNG cộng hoa hồng ngay — xem mục 12), gửi tin chào mừng
  qua `sendSystemMessage()`.
- **Quên mật khẩu** (OTP 6 số, KHÔNG dùng link-token): `POST
/api/auth/forgot-password` sinh mã, hash SHA-256 lưu `PasswordResetToken`
  (KHÔNG lưu plaintext), gửi qua Resend (thiếu key → log ra console). `POST
/api/auth/reset-password` verify mã (`timingSafeEqual`, chống timing
  attack) + đổi mật khẩu trong 1 request. Luôn trả **cùng 1 message** cho
  mọi nhánh thất bại (chống dò email tồn tại). Khoá mã sau 5 lần sai
  (`PASSWORD_RESET_MAX_ATTEMPTS`), hết hạn sau 10 phút.

### Phân quyền — `src/lib/authz.ts`

| Hàm | Dùng cho | Hành vi |
|---|---|---|
| `requireAdminPage()` | Server Component (page/layout admin) | Không session → `redirect("/dang-nhap?callbackUrl=/admin")`. `banned` hoặc `role!=="ADMIN"` → `redirect("/")`. |
| `requireUser()` | API route | Trả `{session, error}`. Không session → 401. `banned` → 403. |
| `requireUserRateLimited(key, limit, windowMs)` | API route dễ bị lạm dụng | Gọi `requireUser()` rồi rate-limit theo `key:userId`, vượt → 429 kèm `Retry-After`. |
| `requireSeller()` | API route seller | Trả `{session, seller, error}`. Chưa có `Seller` → 403. `seller.suspended` → 403 (chặn TẦNG API mọi hành động bán hàng — đăng sản phẩm, rút tiền, đấu giá... nhưng KHÔNG chặn chat/diễn đàn/mua hàng của họ). |
| `requireAdmin()` | API route admin | `role!=="ADMIN"` → 403. |

`banned`/`suspended` được đọc lại **mỗi request** (không có session-invalidation
tức thời) — đây là đánh đổi có chủ đích (đơn giản, không cần session store
riêng), độ trễ tối đa là tới request kế tiếp của user.

---

## 2. Giỏ hàng → Thanh toán → Escrow (`POST /api/checkout`)

File quan trọng nhất hệ thống: `src/app/api/checkout/route.ts`. Retry ở
**tầng ngoài** transaction nếu `orderCode` trùng unique (`P2002`) — tối đa
`ORDER_CODE_MAX_RETRIES` lần, mỗi lần chạy lại TOÀN BỘ transaction vì Postgres
đã abort transaction cũ.

**Trong 1 `prisma.$transaction`, theo đúng thứ tự:**

1. **Tính giá từng dòng hàng** — áp Mega Sale (`computeEffectivePrice()`,
   `src/lib/mega-sale.ts`) lên `unitPrice`. Kiểm `productStockItem.count()`
   để biết sản phẩm/variant đang ở "chế độ kho thật" hay "kho số học". Rẽ
   nhánh theo `productType` (xem mục 3).
2. **Claim kho thật** (nếu có): raw SQL `SELECT ... FOR UPDATE SKIP LOCKED`
   (lọc `status='AVAILABLE' AND (expiresAt IS NULL OR expiresAt>NOW())`,
   `LIMIT quantity`) — 2 checkout song song không bao giờ trùng bản ghi.
   Đánh dấu `SOLD` ngay. Nếu có đơn vị có `expiresAt`, giá được **prorate**
   theo `nominalTermDays` (`src/lib/prorate.ts`).
3. **Mã giảm giá**: chỉ áp cho item cùng `sellerId` với `DiscountCode`, tăng
   `usedCount` nguyên tử có điều kiện ngay trong `updateMany`.
4. **Kiểm ví buyer** (fast-fail).
5. **Tạo `Order`** (`status: "ESCROW"`).
6. **Tính phí sàn hiệu lực** (`getEffectiveFeePercent()`, mục 12) — freeze
   vào từng `OrderItem`.
7. **Tạo từng `OrderItem` tuần tự** (KHÔNG dùng nested `create`, vì cần đúng
   `id` để gắn `ProductStockItem`/`ServiceIntake`) — snapshot
   `warrantyHours` (mục 5), tính `escrowReleaseAt` (= `deliveryDeadline` nếu
   pre-order, else `now + ESCROW_HOLD_DAYS` ngày = 3), ghi
   `OrderStatusHistory` dòng khởi tạo, trừ kho **có điều kiện** (chỉ khi
   không phải kho thật/pre-order/service — `updateMany` gate `stock>=quantity`).
8. **Trừ ví buyer nguyên tử**: `updateMany({where:{walletBalance:{gte:total}}})`
   — đây mới là chốt chặn thật (bước 4 chỉ fast-fail).
9. **Ghi `WalletTransaction`** (`type:"PURCHASE"`, `amount:-total`).
10. **Hoa hồng affiliate**: `accrueCommission()` nếu buyer có `referredById`
    (mục 12).

**Giỏ hàng client** (`src/context/CartContext.tsx`): snapshot giá/tên lúc
thêm, lưu `localStorage` — server KHÔNG tin giá từ client, luôn tính lại từ
DB. Định danh 1 dòng theo `(productId, variantId)`.

---

## 3. 4 loại sản phẩm & cách giao hàng

`Product.productType`: `"PRODUCT"` (default) | `"SERVICE"` | `"TUT_TRICK"` |
`"TOOL"`.

| Loại | `quantity` | Tồn kho | `deliveredPayload` lúc checkout | Model phụ |
|---|---|---|---|---|
| **PRODUCT** (kho số học) | tự do | trừ `Product.stock`/`ProductVariant.stock` có điều kiện | `null` | — |
| **PRODUCT/TOOL** (kho thật) | tự do | claim `ProductStockItem` (`FOR UPDATE SKIP LOCKED`) | nội dung claim (plaintext hoặc ciphertext nếu TOOL) | `ProductStockItem` |
| **SERVICE** | bắt buộc =1 | không có khái niệm tồn kho | `null` (buyer cung cấp thông tin CHO seller, không nhận gì tự động) | `ServiceFieldDefinition`, `ServiceIntake`, `ServiceCredentialAccessLog` |
| **TUT_TRICK** | bắt buộc =1 | không claim/trừ | `JSON.stringify([product.tutTrickContent])` — nội dung cố định, bán lặp lại vô hạn | — |
| **TOOL** | tự do | như PRODUCT kho thật | ciphertext AES-256-GCM (nếu có kho); `toolUsageGuide`/`toolDeliveryLink` đọc **live** từ `Product` lúc reveal (không snapshot) | `ProductStockItem` |

### Validate đăng sản phẩm — `POST /api/seller/products`

Rate-limit theo seller (`requireSellerRateLimited`, `SELLER_PRODUCT_CREATE_LIMIT`
= 20/`SELLER_PRODUCT_CREATE_WINDOW_MS` = 1 giờ — `src/lib/constants.ts`).
Chặn đăng trùng nhẹ nhàng: cùng seller đăng lại đúng tên (không phân biệt
hoa/thường) còn `PENDING`/`APPROVED` trong `DUPLICATE_PRODUCT_WINDOW_HOURS`
(24h) → 400 (loại trừ `REJECTED`, không cản resubmit sau khi bị từ chối).
Độ dài `name`/`shortDescription`/`description`, giá/kho (`MAX_PRODUCT_PRICE_VND`
= 500 triệu, `MAX_PRODUCT_STOCK` = 100.000), số `serviceFields`
(`SERVICE_FIELDS_MAX_COUNT` = 20) và số `ProductVariant`/sản phẩm
(`PRODUCT_MAX_VARIANTS` = 30) đều có trần cấu hình được qua hằng số trong
`constants.ts`, validate cả `AddProductForm.tsx` lẫn server (server là chốt
chặn thật). Chi tiết đầy đủ + lịch sử phát hiện: xem `PRODUCT_LISTING_AUDIT.md`
(local-only, không push).

### SERVICE — buyer cung cấp thông tin cho seller

Seller khai `Product.serviceDeliveryMethods` (JSON mảng mã trong
`SERVICE_DELIVERY_METHODS = ["add_as_admin", "app_password", "full_credential"]`,
sắp theo thứ tự an toàn giảm dần) + `ServiceFieldDefinition[]` (mỗi field có
`inputType`: `text`/`url`/`textarea`/`secret` — **`secret` là nguồn DUY NHẤT**
xác định "nhạy cảm", không có cờ `isSensitive` riêng).

Lúc checkout: buyer chọn 1 `deliveryMethod` trong tập seller cho phép, điền
đủ field. Field `secret` **mã hoá ngay trong transaction checkout** bằng
`encryptSensitiveFields()` (`src/lib/service-crypto.ts`) — **fail-closed**:
thiếu `SERVICE_CREDENTIAL_ENCRYPTION_KEY` thì chặn cứng đặt đơn dịch vụ có
field nhạy cảm, không có đường lùi lưu plaintext. Tạo `ServiceIntake` gắn
`orderItemId`.

**Seller xem field nhạy cảm**: chỉ được xem SAU khi bấm "Nhận đơn"
(`sellerAcceptedAt` được set) và TRƯỚC `sensitiveRevealDeadline` (=
`sellerAcceptedAt + credentialViewWindowHours`, mặc định 48h nếu seller
không khai, validate 1-168h). Mỗi lần xem ghi 1 dòng
`ServiceCredentialAccessLog`. Field nhạy cảm bị **xoá cứng** (set NULL) khi
`OrderItem` rời `ESCROW` an toàn (RELEASED/CANCELLED).

### TUT_TRICK — bán nội dung/hướng dẫn

`Product.tutTrickContent` — nội dung ĐẦY ĐỦ, private, đọc trực tiếp trong
checkout để gán `deliveredPayload`. **Không bao giờ** vào `mapProduct()`/
Product public — "Mô tả chi tiết" (`description`) vẫn public làm teaser, không
lộ đáp án.

### TOOL — Tool/AI Agent

3 cách giao, kết hợp tự do:
1. **Kho tài khoản** — dùng lại `ProductVariant`/`ProductStockItem` như
   PRODUCT, nhưng `content` được **mã hoá AES-256-GCM** khi seller nhập kho
   (`POST /api/seller/products/[productId]/stock`).
2. **Link tải** (`Product.toolDeliveryLink`) — tài nguyên DÙNG CHUNG (không
   tiêu hao), đọc **live** lúc reveal-delivered, không snapshot vào
   `OrderItem`.
3. ~~Upload file .zip lên sàn~~ — **ĐÃ GỠ BỎ (2026-08-18)**, lý do bảo mật
   (tránh sàn phát tán mã độc). 3 cột `toolFileUrl`/`toolFileName`/
   `toolFileSize` còn trong DB nhưng **deprecated**, không route/UI nào
   đọc/ghi nữa. Admin duyệt sản phẩm TOOL có link chỉ được xem **dạng text**
   (không tự mở), kèm cảnh báo không tải/chạy trên máy cá nhân + link tiện
   ích VirusTotal.

`toolUsageGuide` (quy trình sử dụng đầy đủ) cũng đọc live, cùng nguyên tắc
private/gated như `tutTrickContent`.

### Mã hoá dùng chung — `src/lib/service-crypto.ts`

AES-256-GCM (Node `crypto` built-in). IV 12 byte ngẫu nhiên/lần mã hoá. Khoá
từ env `SERVICE_CREDENTIAL_ENCRYPTION_KEY` (32 byte hex) — **BẮT BUỘC**,
không giống các key optional khác (VNPay/Telegram...). `keyVersion` hỗ trợ
xoay khoá tương lai (hiện luôn =1). Dùng chung cho cả `ServiceIntake` (nhiều
field) lẫn `ProductStockItem.content` của TOOL (1 field). Không bao giờ log
plaintext/ciphertext.

---

## 4. Cơ chế "lộ hàng" (reveal-delivered)

`POST /api/orders/[orderItemId]/reveal-delivered` — điểm DUY NHẤT trả nội
dung đã giao cho buyer, và đồng thời là **mốc neo "đã nhận hàng" toàn sàn**
(mọi loại hàng, kể cả dịch vụ không có gì để xem).

1. `requireUser()`, verify `order.buyerId === session.user.id` (404 chung
   nếu không, tránh lộ đơn người khác tồn tại).
2. `status==="CANCELLED"` → 400 (đã hoàn 100%, mất quyền xem lại).
3. Pre-order chưa giao (`isPreOrder && deliveredPayload===null`) → 400,
   **tuyệt đối không set `receivedAt`** (chặn lỗ hổng "nhận hàng khống").
4. `markReceivedIfNeeded()` (mục 5) — idempotent, set `receivedAt` +
   `warrantyExpiresAt` lần đầu.
5. Ghi `DeliveredPayloadAccessLog` (append-only) **trước khi commit** —
   fail-closed, lỗi ghi log rollback cả nội dung trả về.
6. Ngoài transaction: nếu có `deliveredPayloadEncryption` (TOOL) → giải mã
   từng phần tử theo đúng index. Lỗi giải mã → 500 chung, **không rollback**
   `receivedAt` (nội dung đã tồn tại thật, chỉ tạm không đọc được).
7. Response: `deliveredPayload`, `deliveredExpiresAt`, `usageGuide` (chỉ
   TOOL), `toolDeliveryLink` (chỉ TOOL, đọc live), `justReceived`.

**UI** (`src/components/DeliveredPayloadButton.tsx`, prop `mode`):
`credential` (mặc định) hiện chip 1 dòng + copy; `guide` (TUT_TRICK) hiện văn
bản đầy đủ; `tool` hiện cả 3: quy trình sử dụng → credential đã giải mã →
nút "Mở link tải tool" (kèm disclaimer tự quét virus). Không nhận nội dung
qua prop — chỉ gọi API khi bấm "Xem".

---

## 5. Bảo hành

Field trên `Product` (seller khai lúc đăng): `warrantyValue` (default 0),
`warrantyUnit` (`"hour"|"day"`). `0` = bán đứt, không bảo hành.
`productType="PRODUCT"` (kho thật) bị ép tối thiểu `MIN_WARRANTY_HOURS_PRODUCT`
= 24h.

Field trên `OrderItem` (snapshot lúc checkout, `src/lib/warranty.ts`):
- `warrantyHours` — **snapshot đóng băng** tại thời điểm mua (`null` = đơn
  cũ trước khi có tính năng này, dùng luật fallback 7 ngày kể từ
  `releasedAt`).
- `receivedAt` — mốc buyer bấm lộ hàng lần đầu (`null` = bảo hành chưa bắt
  đầu tính).
- `warrantyExpiresAt` = `receivedAt + warrantyHours`, tính sẵn và đóng băng
  ngay lúc set — không đổi dù seller sửa `Product.warrantyValue` sau đó.

Hàm chính (`src/lib/warranty.ts`):
- `markReceivedIfNeeded(tx, item)` — mốc neo duy nhất, gọi từ reveal-delivered
  và từ `releaseDueEscrow()` (lưới an toàn nếu buyer chưa từng bấm).
- `getWarrantyDeadline(item)` — hạn khiếu nại thật (ưu tiên `warrantyHours`
  snapshot, fallback `releasedAt + 7 ngày` cho đơn cũ).
- `getEffectiveEscrowReleaseAt(item)` — nếu cờ `ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY`
  (constants.ts, hiện `true`) bật: `max(escrowReleaseAt, warrantyExpiresAt)`
  — đơn có bảo hành dài hơn 3 ngày mặc định sẽ bị giữ ký quỹ lâu hơn. Nếu
  buyer chưa từng "nhận hàng" (`warrantyExpiresAt` null) → vẫn dùng
  `escrowReleaseAt` gốc (không giữ vô thời hạn).

---

## 6. Giải ngân escrow & CRON

`src/lib/escrow.ts` → `releaseDueEscrow(actor)` — dùng chung giữa nút admin
(`POST /api/admin/escrow/release`) và cron:

1. Lọc `status==="ESCROW" AND escrowReleaseAt<=now`.
2. Pre-order chưa giao (`isPreOrder && deliveredPayload===null`) → **skip
   tuyệt đối**, không bao giờ giải ngân dù đến hạn (xem mục 7).
3. Lưới an toàn: nếu `receivedAt` còn null nhưng đã có nội dung giao (hoặc
   là SERVICE) → gọi `markReceivedIfNeeded()` ngay để bắt đầu tính bảo hành.
4. `getEffectiveEscrowReleaseAt() > now` → skip (bị bảo hành kéo dài).
5. Gate nguyên tử `ESCROW→RELEASED`, set `releasedAt`, ghi
   `OrderStatusHistory`, cộng ví seller = `price×quantity − platformFeeAmount`.

### CRON — `vercel.json` + `GET /api/cron/daily`

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 16 * * *" }] }
```
Chạy **1 lần/ngày, 16:00 UTC = 23:00 giờ VN** (gộp mọi việc vào 1 route vì
giới hạn 2 cron/ngày của gói Vercel Hobby). Route PHẢI export `GET` — Vercel
Cron luôn gọi bằng HTTP GET, không cấu hình được method khác; route từng
chỉ export `POST` khiến Vercel Cron nhận 405 Method Not Allowed mỗi lần
gọi thật (bug đã vá 2026-08-19). Xác thực bằng header `Authorization:
Bearer <CRON_SECRET>` (`timingSafeEqual`, fail-closed nếu thiếu biến).
Route gọi song song `releaseDueEscrow({type:"SYSTEM"})` và
`closeDueAuctionSessions()` (mục 10).

**CHƯA có cron cho** (đọc đúng comment trong code, không suy diễn):
- **Hoàn tiền pre-order quá hạn** — chỉ có nút admin bấm tay `POST
/api/admin/preorders/refund-overdue` (mục 7).
- **Escalate dispute** từ `SELLER_WARRANTY → PLATFORM` sau 24h — buyer phải
  tự bấm nút, hệ thống không tự chuyển phase (mục 8).

---

## 7. Đặt trước (Pre-order)

Rebuild 2026-08-14. Field: `Product.preOrder` (Boolean), `preOrderDeliveryValue`/
`preOrderDeliveryUnit` (thời gian giao cam kết, seller khai — bật preOrder
bắt buộc kèm `preOrderDeliveryValue > 0` VÀ `warrantyValue > 0`, không cho
bán đứt).

Snapshot lúc checkout: `OrderItem.isPreOrder` (đóng băng từ `Product.preOrder`
— seller tắt cờ sau khi bán KHÔNG ảnh hưởng đơn đã tạo), `deliveryDeadline`
= thời điểm mua + thời gian giao snapshot. `escrowReleaseAt` của đơn pre-order
= chính `deliveryDeadline` (không dùng `ESCROW_HOLD_DAYS` mặc định). Bỏ qua
kiểm tra tồn kho lúc checkout (đây là cam kết giao sau, không phải hàng có
sẵn).

**Seller giao hàng**: `POST /api/seller/orders/[orderItemId]/deliver-preorder`
— set `deliveredPayload` thủ công, gate `status:"ESCROW", isPreOrder:true,
deliveredPayload:null, deliveryDeadline:{gt:now}` (deadline đã qua thì
không giao được nữa — đơn đó sắp bị auto-hoàn tiền).

**Tự động hoàn tiền khi seller giao trễ**: `refundPreOrderItem()`
(`src/lib/preorder.ts`) — gate nguyên tử `updateMany({where:{status:"ESCROW",
isPreOrder:true, deliveredPayload:null}})`, hoàn 100% vào ví buyer. Route quét:
`POST /api/admin/preorders/refund-overdue` — lọc `deliveryDeadline<=now`.
**KHÔNG nằm trong cron `/api/cron/daily`** — hiện chỉ chạy khi admin bấm nút
`AdminPreOrderRefundButton.tsx` (Admin > Đơn hàng & Ký quỹ). `releaseDueEscrow()`
tuyệt đối không giải ngân đơn pre-order chưa giao dù quá hạn (chỉ 2 lối
thoát: seller giao trước hạn, hoặc job hoàn tiền quá hạn).

---

## 8. Khiếu nại (Dispute)

`Dispute.phase`: `SELLER_WARRANTY` → `PLATFORM` (đơn còn `ESCROW`) hoặc thẳng
`POST_RELEASE_WARRANTY` (đơn đã `RELEASED`).

**Đơn còn ESCROW:**
- **Buyer mở** → `phase="SELLER_WARRANTY"`, `warrantyDeadline = now +
  WARRANTY_WINDOW_HOURS` (24h) — seller có 24h tự xử qua `POST
/api/seller/disputes/[id]` (`refund`/`reject`).
- **Seller tự mở** → thẳng `PLATFORM` (không tự bảo hành cho chính mình).
- Buyer chỉ escalate lên `PLATFORM` (`POST /api/disputes/[id]/escalate`) khi
  `warrantyRejectedAt !== null` HOẶC `warrantyDeadline <= now` — **buyer tự
  bấm nút**, không tự động.

**Đơn đã RELEASED** (bảo hành sau giải ngân): chỉ buyer mở được, thẳng
`POST_RELEASE_WARRANTY`, điều kiện `isWithinWarranty()` (mục 5) phải `true`.
`OrderItem.status` KHÔNG đổi (vẫn `RELEASED`).

**Admin xử lý** (`POST /api/admin/disputes/[id]`), 5 action:
- `refund_buyer`/`partial_refund`/`release_seller` — chỉ khi `phase==="PLATFORM"`.
- `refund_from_insurance`/`reject_claim` — chỉ khi `phase==="POST_RELEASE_WARRANTY"`,
  đền bù trừ trực tiếp `Seller.insuranceBalance` (đã giải ngân xong, không
  còn escrow để hoàn).

`Message.disputeId` (không FK) tách kênh chat riêng cho từng dispute khỏi
chat chung (`null` = chat chung).

---

## 9. Rút tiền

`POST /api/seller/withdraw-request` — **trừ ví NGAY khi tạo yêu cầu** (khoá
tiền, `updateMany` gate `walletBalance>=amount`), không phải khoá mềm.

- **Bank** (`method:"bank"`): `amount >= MIN_WITHDRAW_AMOUNT` (50.000đ), bắt
  buộc `bankName`/`accountNumber`/`accountHolder` → gộp JSON vào
  `WalletTransaction.recipientInfo`.
- **USDT TRC20** (`method:"usdt_trc20"`): `amount >= MIN_USDT_WITHDRAW_AMOUNT`
  (300.000đ), validate địa chỉ TRC20. Tỷ giá lấy server-side qua
  `getUsdtWithdrawRate()` (`src/lib/payment/exchange-rate.ts`) — giá live
  CoinGecko (hoặc fallback `usdt_vnd_rate` nếu CoinGecko lỗi) **đã áp thêm
  biên sàn** `usdt_withdraw_margin_percent` (PaymentConfig, mặc định 4%,
  seller nhận ÍT USDT hơn giá live) rồi mới **khoá tại thời điểm tạo yêu
  cầu** (không tính lại lúc admin duyệt). Chiều nạp dùng hàm song song
  `getUsdtDepositRate()` với `usdt_deposit_margin_percent` (buyer phải gửi
  NHIỀU USDT hơn giá live) — 2 hàm này là nguồn DUY NHẤT cho cả chỗ tính
  tiền lẫn chỗ hiển thị ước tính ở mỗi chiều, tránh lệch số.

**Admin duyệt** (`POST /api/admin/withdrawals/[id]`): `approve` chỉ đổi
trạng thái (tiền đã trừ từ lúc tạo, không đụng ví lần 2); `reject` hoàn lại
đúng số đã khoá. Không có model `WithdrawRequest` riêng — mọi thứ nằm trong
cột/JSON của `WalletTransaction`.

---

## 10. Đấu giá vị trí vàng

**Đã REBUILD hoàn toàn (2026-08-15)** — hệ cũ (6 slot cố định, xoay vòng
liên tục, không khoá tiền lúc đặt giá) đã bị **DROP TABLE**. Hệ mới: **1
phiên duy nhất mỗi tuần, 20:00–22:00 tối Chủ Nhật (Asia/Ho_Chi_Minh, UTC+7
cố định)** — `src/lib/auction-schedule.ts`:
```ts
AUCTION_WINDOW_START_HOUR = 20;
AUCTION_WINDOW_END_HOUR = 22;
```

**Model**: `AuctionSetting` (singleton — `slotCount` mặc định 6, `floorPrice`
mặc định 50.000đ, admin cấu hình qua UI). `AuctionSession` (1 dòng = đúng 1
khung giờ CN, chỉ tạo LƯỜI khi có bid đầu tiên — tuần không ai đặt giá thì
không có dòng nào). `AuctionBid` (`@@unique([sessionId, sellerId])` — tối đa
1 bid/seller/phiên, đổi ý = nâng giá cùng dòng).

**Luồng đặt giá** (`src/lib/auction.ts`):
1. `requireOpenSessionForBidding()` — ngoài khung giờ → lỗi rõ ràng.
2. `placeOrRaiseBid()` — lần đầu: trừ ví, tạo `WalletTransaction
type:"AUCTION_HOLD"` (khoá tiền, `status:"PENDING"`), tạo `AuctionBid
status:"ACTIVE"`. Nâng giá: hoàn khoá cũ → khoá mức mới → update cùng dòng
   `AuctionBid`.

**Chốt phiên** (`closeAuctionSession()`, chạy bởi cron hoặc admin bấm tay):
- Gate `OPEN→PENDING_REVIEW`, đóng băng `slotCount` vào chính session.
- Top N (sort `amount desc, createdAt asc`) → `PENDING_APPROVAL`, gán `rank`.
- Ngoài Top N → hoàn tiền ngay, `status:"LOST"` (tự động, không cần admin).
- Top N rỗng → đóng thẳng `CLOSED`.

**Admin duyệt** (`POST /api/admin/auction/bids/[id]/approve|reject`):
- `approve` → `AuctionBid WON`, `WalletTransaction` khoá đổi thẳng
  `type→PURCHASE, status→CONFIRMED` (không trừ ví thêm), set
  `Product.featuredUntil = getNextWindowStart(session.windowStart)` (Chủ
  Nhật kế tiếp, không phụ thuộc lúc admin bấm) → hiện đúng 1 tuần.
- `reject` → hoàn tiền, vị trí để trống (KHÔNG tự đôn runner-up — người kế
  tiếp đã được hoàn tiền lúc chốt phiên).

Trang `/trang-ban-hang/quang-ba` là **bản render riêng, đầy đủ logic giống
hệt `/dau-gia`** (chỉ khác layout khung dashboard seller) — không phải trang
link-out, không có cơ chế quảng bá nào khác ngoài đấu giá này.

### Featured Homepage — cơ chế ghim thủ công (song song, không thay thế)

`Product.isFeatured`/`featuredOrder` (admin ghim tay qua `/admin/noi-bat`) —
`getFeaturedProducts()` chạy **3 tầng, không loại trừ nhau**: (1) admin ghim
→ (2) `hot=true` HOẶC đang thắng đấu giá (`featuredUntil>now`, cơ chế cũ giữ
nguyên) → (3) điền nốt bằng sản phẩm bán chạy nhất. Tương tự cho
`getFeaturedSellers()`.

---

## 11. Nạp tiền — VNPay / SePay / USDT / Bank thủ công

Tất cả đọc cấu hình qua `getPaymentConfig(key)` (`src/lib/payment/config.ts`)
— **giá trị DB (`PaymentConfig`, admin sửa qua `/admin/cai-dat`) luôn ưu
tiên hơn `.env`**, thiếu cả 2 thì tính năng tự ẩn/disable.

| Kênh | Cơ chế | Trạng thái thật (theo `.env` hiện tại) |
|---|---|---|
| **VNPay** | Create → redirect có chữ ký HMAC-SHA512 → Return URL (hiển thị cho user) + **IPN** (nguồn chân lý thật để cộng ví, server-to-server, có retry) | Khung code đầy đủ, đã sửa bug encode chữ ký (`application/x-www-form-urlencoded`: space→`+`) — **chưa hoạt động**, thiếu `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET` thật |
| **Ngân hàng qua VietQR + SePay webhook** (`POST /api/wallet/deposit-request` tạo yêu cầu, `POST /api/webhook/sepay` đối soát) | Wizard 3 bước ở `/nap-tien` (`DepositPanel.tsx`): Bước 1 chọn phương thức → Bước 2 nhập số tiền (`MIN_BANK_DEPOSIT_VND`-`MAX_BANK_DEPOSIT_VND`) bấm Xác nhận → **server** (không tin client) sinh `WalletTransaction.depositCode` (UNIQUE, khớp `/NAP[A-Z0-9]{6,}/`) + `expiresAt` (`BANK_DEPOSIT_EXPIRY_MINUTES`, mặc định 15 phút) → Bước 3 hiện QR `img.vietqr.io/image/{BIN}-{STK}-compact.png?amount=...&addInfo={code}` (auto-fill số tiền + nội dung khi quét bằng app ngân hàng) + đếm ngược, trang tự poll `GET /api/wallet/deposit/[id]` mỗi 4s. Webhook SePay xác thực HMAC-SHA256 (`x-sepay-signature`) HOẶC API Key — `timingSafeEqual`, fail-closed 503 nếu thiếu cả 2 secret — khớp `depositCode` trong nội dung CK (14 ngày gần nhất) → CONFIRMED, cộng đúng **số tiền THẬT nhận được** (không phải số buyer xin nạp). Khớp SAU KHI `expiresAt` vẫn cộng bình thường (an toàn cho khách), chỉ ghi `adminNote` đánh dấu trễ hạn. Không khớp mã nào → lưu `SepayUnmatchedTransaction` cho admin gán tay. | **Chưa hoạt động** — `SEPAY_WEBHOOK_SECRET`/`SEPAY_API_KEY` rỗng, route đang fail-closed (QR/thông tin CK vẫn hiện đúng, chỉ chưa tự động cộng tiền) |
| **USDT TRC20** (`POST /api/wallet/deposit-usdt/intent` + `POST /api/wallet/deposit-usdt`) | **2 bước** (đổi 2026-08-19, vá lỗ hổng front-run TxID — xem `LAUNCH_AUDIT.md` local): (1) buyer đặt trước 1 `UsdtDepositIntent` — nhập VNĐ muốn nạp, server cấp 1 số USDT ĐỊNH DANH RIÊNG tính theo `getUsdtDepositRate()` (giá live CoinGecko/fallback **đã áp biên sàn** `usdt_deposit_margin_percent`, mặc định 4% — xem §11b, phần nguyên ≈ quy đổi, 6 số thập phân cuối random duy nhất trong các intent đang PENDING), hạn 45 phút; (2) buyer chuyển ĐÚNG số đó rồi dán TxID — server xác minh on-chain thật qua TronGrid (`gettransactioninfobyid`, kiểm `receipt.result==="SUCCESS"`, quét event log `Transfer` đúng contract + đúng ví sàn, đọc số tiền từ log không tin calldata) rồi **khớp số USDT thực nhận với đúng 1 intent PENDING** — cộng ví **chủ intent** đúng bằng `vndAmount` đã đóng băng lúc tạo intent (không tính lại theo tỷ giá), KHÔNG PHỤ THUỘC ai gọi API xác nhận (trước đây cộng thẳng cho người gọi, bị lợi dụng "cướp" TxID công khai trên Tronscan). Không khớp intent nào → không cộng cho ai, rơi về PENDING cho admin đối chiếu tay. Chống trùng bằng **unique index** trên `gatewayRef` + gate nguyên tử trên intent (`PENDING→MATCHED`). | **Sẵn sàng hoạt động ngay khi có `usdt_trc20_address` thật** — không phụ thuộc secret bên thứ 3 (TronGrid public endpoint) |

### 11b. Biên lợi nhuận sàn (spread) tỷ giá USDT/VNĐ

`src/lib/payment/exchange-rate.ts` có 2 hàm tách biệt, **nguồn DUY NHẤT** cho
cả chỗ tính tiền lẫn chỗ hiển thị ước tính ở mỗi chiều (không có nơi nào khác
gọi thẳng `getLiveUsdtVndRate()` — nguồn RAW nội bộ — ngoài 2 hàm này):

- `getUsdtDepositRate()` = giá RAW × (1 − `usdt_deposit_margin_percent`/100)
  — dùng ở `POST /api/wallet/deposit-usdt/intent` (tính số USDT buyer phải
  chuyển) VÀ `/nap-tien` (số hiển thị "1 USDT ≈ Xđ").
- `getUsdtWithdrawRate()` = giá RAW × (1 + `usdt_withdraw_margin_percent`/100)
  — dùng ở `POST /api/seller/withdraw-request` (tính số USDT trả seller) VÀ
  `GET /api/seller/usdt-rate` (số xem trước trên `SellerWithdrawPanel`).

Cả 2 key `usdt_deposit_margin_percent`/`usdt_withdraw_margin_percent` là
`PaymentConfig` thường (không migration, giống `usdt_vnd_rate`), admin đổi
qua `/admin/cai-dat`, validate `[0, 100)`. Thiếu cả DB lẫn `.env` → mặc định
**4%** (code-hoá cứng `DEFAULT_USDT_MARGIN_PERCENT`, không phải 0%, đây là
lựa chọn nghiệp vụ đã chốt — sàn luôn ăn biên trừ khi admin chủ động đặt 0).
Chưa có audit trail lưu riêng biên/tỷ giá gốc theo từng giao dịch (`rate`
lưu trên `UsdtDepositIntent`/`WalletTransaction` là số ĐÃ áp biên) — nếu cần
tra lời/lỗ theo từng giao dịch sau này, cần thêm cột `baseRate`/
`marginPercent` (chưa làm, để sau).
| **Bank thủ công** | `getBankInfo()` chỉ đọc cấu hình hiển thị — buyer tạo `WalletTransaction PENDING`, admin duyệt tay tại `/admin/nap-tien`. Là **nền** cho SePay đối chiếu, không bị thay thế. | Luôn hoạt động nếu điền đủ 3 field |

---

## 12. Phí sàn & Hoa hồng giới thiệu (Affiliate)

**2 cơ chế % tách biệt, không trộn lẫn:**

### Phí sàn (`src/lib/platform-fee.ts`)

`PlatformFeeSetting` (singleton, `defaultFeePercent`) + `PlatformFeeSchedule`
(mốc `[startAt,endAt]→percent` ghi đè tạm thời, không chồng lấn) +
`PlatformFeeChange` (lịch sử). `getEffectiveFeePercent()` ưu tiên schedule
đang hiệu lực. **Freeze vào từng `OrderItem`** lúc checkout
(`platformFeePercent`/`platformFeeAmount`) — đổi % sau không hồi tố. Trừ
thật lúc giải ngân: `sellerCredit = itemValue − platformFeeAmount` (mục 6).

### Hoa hồng giới thiệu (`src/lib/commission.ts`)

**Không còn số tiền cố định** (hằng số `REFERRAL_COMMISSION_VND` cũ đã bị
xoá khỏi code) — giờ là **% cấu hình động** qua `CommissionSetting`
(singleton: `commissionPercent` khởi tạo 4%, `perReferrerCap`,
`capPeriodDays`, `enabled` kill-switch).

- **Phát sinh** (`accrueCommission()`, trong transaction checkout): tạo
  `ReferralCommission status:"PENDING"` nếu buyer có `referredById` hợp lệ,
  không tự giới thiệu mình, đã từng nạp tiền thật (`DEPOSIT/CONFIRMED`), và
  `enabled=true`. **Chưa cộng ví ngay.** Gắn cờ `flagged=true` nếu
  `referrer.signupIp === referred.signupIp` (chỉ cảnh báo, không chặn).
- **Chốt** (`finalizeOrderCommission()`, chạy khi đơn settle — escrow
  release/dispute): tính lại trên phần **thực sự RELEASED**, bắt buộc
  `2×hoa_hồng < phí_sàn_thực_thu` (đảm bảo sàn luôn lãi ròng dương), áp trần
  theo kỳ nếu bật → `PENDING→ELIGIBLE` hoặc `CANCELLED`.
- **Giải ngân** (`POST /api/admin/commissions/disburse`): chỉ khoản
  `ELIGIBLE` và `eligibleAt<=now`, cộng ví + `WalletTransaction
type:"REFERRAL_BONUS"`.

Hoa hồng là khoản chi **trích từ phí sàn đã thu**, không phải phí đánh thêm
lên buyer/seller.

---

## 13. Diễn đàn, Đánh giá, Hồ sơ gian hàng, Mega Sale, Nội dung trang chủ

### Diễn đàn

`ForumPost`/`ForumComment`/`ForumLike` (`@@unique([postId,userId])`, toggle
thích) — mọi user đăng nhập đăng bài/bình luận/thích. `ForumReport`
(`postId` HOẶC `commentId`, `@@unique([reporterId, postId/commentId])`) —
admin `hide` (set `hidden:true`, không xoá cứng) hoặc `dismiss`.

### Đánh giá (Review)

**Gắn theo TỪNG SẢN PHẨM** (`Review.productId`, nullable) nhưng **vẫn giữ**
`@@unique([sellerId, userId])` — mỗi buyer chỉ có 1 review/gian hàng
(`upsert`, gửi lần 2 = ghi đè, không tạo review mới dù review khác
`productId`). Điều kiện: đã mua đúng sản phẩm đó (nếu có `productId`) hoặc
bất kỳ sản phẩm nào của seller (nếu không). `hidden` (admin ẩn spam, không
xoá cứng).

### Hồ sơ/Avatar/Cover gian hàng

`Seller.avatarUrl`, `coverUrl`, `specialty` (text ngắn, KHÔNG có field liên
hệ cá nhân FB/Zalo/SĐT — cố ý giữ giao dịch trong hệ thống, bảo vệ escrow +
phí sàn). Sửa qua `/trang-ban-hang/ho-so` → `PATCH /api/seller/profile`,
`POST /api/seller/avatar`, `POST /api/seller/cover`.

### Mega Sale

`Product.megaSaleActive`/`megaSaleType`(`PERCENT`|`FIXED`)/`megaSalePercent`/
`megaSaleFixedPrice`/`megaSaleEndsAt` — seller tự bật/tắt, áp đồng loạt lên
`price`/mọi `variant.price`. `computeEffectivePrice()`
(`src/lib/mega-sale.ts`) là hàm DUY NHẤT tính giá sau sale, dùng cả ở hiển
thị lẫn checkout thật (real-time, không cần cron).

### Nội dung trang chủ

`HomeBanner` (model riêng, thay thế 4-ô-ảnh-cố-định cũ) — `slot`
(`LARGE`/`SMALL_1`/`SMALL_2`), admin quản lý qua `/admin/noi-dung`.
`SiteConfig` (key-value, 10 key: ticker, social links, `insurance_fund_target`,
`search_tags`...) — giá trị DB ưu tiên hơn default code.

---

## 14. Admin Control Center & kiểm duyệt

Shell riêng (`src/app/admin/layout.tsx`, theme tối `.admin-shell`, KHÔNG dùng
Header/Footer site mua sắm). Guard 2 lớp: layout + từng `page.tsx` con đều
gọi `requireAdminPage()`.

**Sidebar** (`src/components/AdminSidebar.tsx`), 6 nhóm:

| Nhóm | Mục | Path | Việc chính |
|---|---|---|---|
| Tổng quan | Tổng quan | `/admin` | KPI theo khoảng ngày |
| Vận hành | Người dùng | `/admin/nguoi-dung` | Khoá/mở khoá (`User.banned`), đổi role |
| Vận hành | Người bán | `/admin/nguoi-ban` | Verify/suspend gian hàng |
| Vận hành | Đơn hàng & Ký quỹ | `/admin/don-hang` | Lọc theo status, giải ngân tay, hoàn tiền pre-order quá hạn tay |
| Vận hành | Nội dung trang web | `/admin/noi-dung` | `HomeBanner` + `SiteConfig` |
| Vận hành | Nổi bật trang chủ | `/admin/noi-bat` | Ghim `isFeatured`/`featuredOrder` (mục 10) |
| Kiểm duyệt | Sản phẩm | `/admin/san-pham` | Duyệt PENDING + quản lý toàn bộ (ẩn/sửa) |
| Kiểm duyệt | Danh mục | `/admin/danh-muc` | Duyệt category đề xuất + cây danh mục cha/con |
| Kiểm duyệt | Diễn đàn | `/admin/dien-dan` | Xử lý `ForumReport` |
| Kiểm duyệt | Đánh giá | `/admin/danh-gia` | Ẩn review spam |
| Tài chính | Nạp tiền | `/admin/nap-tien` | Duyệt tay + xử lý SePay unmatched |
| Tài chính | Rút tiền | `/admin/rut-tien` | Duyệt/từ chối |
| Tài chính | Hoa hồng | `/admin/hoa-hong` | Giải ngân + cấu hình % (mục 12) |
| Tài chính | Phí sàn | `/admin/phi-san` | Cấu hình % + lịch (mục 12) |
| Tài chính | Sức khoẻ tài chính | `/admin/tai-chinh` | Snapshot tổng quỹ/escrow (đọc-only) |
| Giải quyết | Khiếu nại | `/admin/khieu-nai` | Xử lý Dispute phase PLATFORM/POST_RELEASE_WARRANTY |
| Giải quyết | Đấu giá vị trí vàng | `/admin/dau-gia` | Duyệt/từ chối bid Top N (mục 10) |
| Hệ thống | Nhật ký hoạt động | `/admin/nhat-ky` | `AdminAuditLog` — mọi thao tác admin |
| Hệ thống | Cài đặt hệ thống | `/admin/cai-dat` | `PaymentConfig` — KHÔNG bao giờ hiện secret ra client thường |

### Bảng kiểm duyệt PENDING (đầy đủ)

| Đối tượng | Model.field | Giá trị | Route |
|---|---|---|---|
| Sản phẩm mới | `Product.status` | PENDING→APPROVED/REJECTED | `POST /api/admin/products/[id]` |
| Sản phẩm — ẩn/hiện đang sống | `Product.isActive` | bool | `PATCH /api/admin/all-products/[id]` |
| Danh mục đề xuất | `Category.status` | PENDING→APPROVED | `POST/PATCH /api/admin/categories/[id]` |
| Review | `Review.hidden` | bool | `PATCH /api/admin/reviews/[id]` |
| Báo cáo diễn đàn | `ForumReport.status` | OPEN→RESOLVED_* | `PATCH /api/admin/forum-reports/[id]` |
| Khiếu nại | `Dispute.status`+`phase` | xem mục 8 | `POST /api/admin/disputes/[id]` |
| Nạp tiền | `WalletTransaction.status` (type=DEPOSIT) | PENDING→CONFIRMED/REJECTED | `PATCH /api/admin/deposits/[id]` |
| SePay chưa khớp | `SepayUnmatchedTransaction.status` | UNMATCHED→RESOLVED/IGNORED | `PATCH /api/admin/sepay-unmatched/[id]` |
| Rút tiền | `WalletTransaction.status` (type=WITHDRAW) | PENDING→CONFIRMED/REJECTED | `PATCH /api/admin/withdrawals/[id]` |
| Hoa hồng | `ReferralCommission.status` | xem mục 12 | `POST /api/admin/commissions/disburse` |
| Bid đấu giá | `AuctionBid.status` | xem mục 10 | `POST /api/admin/auction/bids/[id]/approve|reject` |
| Seller xác thực | `Seller.verified` | bool, admin tự bật/tắt (KHÔNG còn quy trình duyệt CCCD) | `PATCH /api/admin/sellers/[id]` |
| Seller khoá gian hàng | `Seller.suspended` | bool | `PATCH /api/admin/sellers/[id]` |
| User khoá | `User.banned` | bool | `PATCH /api/admin/users/[id]` |

`logAdminAction()` (`src/lib/audit.ts`) ghi `AdminAuditLog` ở cuối mỗi route
admin — cố tình swallow lỗi ghi log (không được để audit fail làm hỏng thao
tác chính đã xong).

---

## 15. SEO, phân trang, index DB

### SEO — 3 lớp

1. **`src/app/robots.ts`**: so `Host` header với domain chuẩn (`SITE_URL`,
   `src/lib/seo.ts`). Sai domain (vd `*.vercel.app`) → chặn crawl toàn site.
   Đúng domain → `allow:"/"` trừ `/api/`, `/gio-hang`, `/don-hang`,
   `/tin-nhan`, `/nap-tien`, `/dang-nhap`, `/quen-mat-khau`, `/ho-so-ca-nhan`,
   `/trang-ban-hang`, `/admin`, `/demo`.
2. **`metadata.robots = PRIVATE_ROBOTS`** (`{index:false,follow:false}`,
   `src/lib/seo.ts`) khai ở 9 trang riêng tư (admin, trang-ban-hang, don-hang,
   gio-hang, dang-nhap, ho-so-ca-nhan, quen-mat-khau, tin-nhan, nap-tien).
3. **`src/middleware.ts`**: domain khác chuẩn → gắn header `X-Robots-Tag:
noindex, nofollow` lên mọi response (trừ static/ảnh/favicon).

`src/app/sitemap.ts` luôn dùng `SITE_URL` cố định — liệt kê static pages +
category tree + mọi sản phẩm công khai + seller + bài diễn đàn. KHÔNG đưa
trang riêng tư vào.

### Phân trang

DB-level thật (`skip`/`take`), page size **24** (khai cục bộ ở từng trang,
không phải hằng số dùng chung). `paginateProducts()` (`src/lib/queries.ts`):
sort `newest`/`bestselling` → 1 query trực tiếp; sort `price_asc`/`price_desc`
→ 2 pha (tính giá hiệu lực Mega Sale trong bộ nhớ trước, rồi query đầy đủ
đúng trang). `searchProducts()` không dùng lại hàm này (luôn `createdAt
desc`).

### Index DB chính (`prisma/schema.prisma`)

`Product`: `@@index([status, isActive, categoryId])`,
`@@index([status, isActive, createdAt])`, `@@index([status, isActive, sold])`.
`Seller`: `@@index([suspended])`. `ProductStockItem`:
`@@index([productId, variantId, status])`. `AuctionBid`:
`@@index([sessionId, status])`. Đầy đủ danh sách xem trực tiếp
`schema.prisma` (grep `@@index`/`@@unique`).

---

## 16. Lịch sử tiến hoá schema (pending-sql)

Dự án dùng `prisma db push` (không có thư mục migrations) — mọi thay đổi
schema trên **production (Neon)** phải qua file SQL ở `prisma/pending-sql/`
để user tự chạy trước, sau đó mới cập nhật `schema.prisma` + `prisma generate`
(xem quy trình đầy đủ ở `CLAUDE.md`). Danh sách dưới đây theo thứ tự thời
gian — đọc để hiểu schema đã tiến hoá thế nào:

| File | Ý nghĩa |
|---|---|
| `2026-07-23-stockitem-restrict.sql` | `ProductStockItem.productId` đổi `CASCADE→RESTRICT` — chặn xoá Product còn kho (kể cả đã bán), giữ lịch sử giao hàng |
| `2026-07-24-dispute-refundamount.sql` | Thêm `Dispute.refundAmount` — hỗ trợ hoàn tiền một phần |
| `2026-07-24-dispute-warranty-phase.sql` | Thêm `Dispute.phase`/`warrantyDeadline`/`warrantyRejectedAt` — cơ chế seller tự bảo hành 24h trước khi escalate lên sàn |
| `2026-07-25-message-disputeid.sql` | Thêm `Message.disputeId` (không FK) — tách kênh chat riêng theo từng khiếu nại |
| `2026-07-26-password-reset-otp.sql` | Đổi quên mật khẩu từ link-token sang OTP 6 số — model `PasswordResetToken` |
| `2026-07-27-product-expiry.sql` | Thêm `ProductStockItem.expiresAt`/`nominalTermDays` + `OrderItem.deliveredExpiresAt` — hàng có thời hạn sử dụng (subscription), giá prorate |
| `2026-07-28-service-orders.sql` | Model `ServiceFieldDefinition`/`ServiceIntake`/`ServiceCredentialAccessLog` — nghiệp vụ Dịch vụ (buyer cung cấp thông tin cho seller), `Product.productType` |
| `2026-07-29-category-tree.sql` | `Category.parentId`/`sortOrder`/`isActive` — cây danh mục đa cấp, tạo 4 nhóm cha gốc |
| `2026-07-30-mega-sale.sql` | 5 cột `Product.megaSale*` — khuyến mãi seller tự bật/tắt |
| `2026-07-30-order-released-at.sql` | `OrderItem.releasedAt` — mốc giải ngân THẬT (khác `escrowReleaseAt` chỉ là dự kiến) |
| `2026-07-30-payment-config.sql` | Model `PaymentConfig` — admin cấu hình cổng thanh toán qua DB thay vì chỉ `.env` |
| `2026-07-30-product-isactive.sql` | `Product.isActive` — admin tự ẩn/hiện sản phẩm đang sống (khác `status`) |
| `2026-07-30-review-hidden.sql` | `Review.hidden` — admin ẩn review spam |
| `2026-07-30-review-product.sql` | `Review.productId` (nullable) — review gắn theo sản phẩm, vẫn giữ `@@unique([sellerId,userId])` |
| `2026-07-30-site-config.sql` | Model `SiteConfig` — nội dung động key-value |
| `2026-07-31-fix-non-ascii-slugs.sql` | Sửa data: slug có dấu tiếng Việt (gây 404 vĩnh viễn) → bỏ dấu |
| `2026-07-31-sepay-webhook.sql` | Unique index chống trùng nạp tiền qua SePay webhook + bảng `SepayUnmatchedTransaction` |
| `2026-07-31-usdt-deposit-auto-verify.sql` | Unique index chống trùng — nạp USDT xác minh on-chain tự động qua TronGrid |
| `2026-07-31-usdt-withdrawal.sql` | 4 cột `WalletTransaction.withdrawAddress/usdtAmount/exchangeRate/rateSource` — rút bằng USDT TRC20 |
| `2026-08-01-featured-homepage.sql` | `isFeatured`/`featuredOrder` trên `Product` VÀ `Seller` — admin ghim thủ công trang chủ |
| `2026-08-01-seller-avatar.sql` | `Seller.avatarUrl` |
| `2026-08-02-seller-profile.sql` | `Seller.specialty` |
| `2026-08-03-home-banner.sql` | Model `HomeBanner` — thay 4-ô-ảnh-cố-định cũ trong `SiteConfig` |
| `2026-08-04-wallet-order-link.sql` | Liên kết `WalletTransaction` với `orderId`/`orderItemId` bằng FK thật |
| `2026-08-05-delivered-payload-access-log.sql` | Model `DeliveredPayloadAccessLog` — audit buyer xem nội dung đã giao |
| `2026-08-06-order-status-history.sql` | Model `OrderStatusHistory` — audit lịch sử đổi trạng thái từng `OrderItem` |
| `2026-08-07-tut-trick.sql` | `Product.tutTrickContent` — loại sản phẩm TUT_TRICK |
| `2026-08-08-tool-ai-agent.sql` | `Product.toolUsageGuide` — loại sản phẩm TOOL, kho credential mã hoá |
| `2026-08-11-warranty.sql` | `OrderItem.warrantyHours`/`receivedAt`/`warrantyExpiresAt` — snapshot bảo hành theo từng đơn (mục 5) |
| `2026-08-14-preorder-rebuild.sql` | `Product.preOrderDeliveryValue/Unit` + `OrderItem.isPreOrder`/`deliveryDeadline` — xây lại đặt trước (mục 7) |
| `2026-08-14-withdraw-recipient-info.sql` | `WalletTransaction.recipientInfo` (JSON) — gộp thông tin nhận tiền |
| `2026-08-15-auction-rebuild.sql` | DROP hệ đấu giá cũ (6 slot xoay vòng), xây lại theo phiên tuần cố định — model `AuctionSetting`/`AuctionSession`/`AuctionBid` mới (mục 10) |
| `2026-08-17-product-listing-indexes.sql` | 3 composite index trên `Product` + 1 index `Seller.suspended` — tối ưu phân trang |
| `2026-08-17-seller-cover.sql` | `Seller.coverUrl` |
| `2026-08-18-tool-delivery-link-file.sql` | `Product.toolDeliveryLink`/`toolFileUrl`/`toolFileName`/`toolFileSize` — giao TOOL bằng link/file (3 cột file sau đó bị **deprecated**, xem mục 3) |
| `2026-08-19-usdt-deposit-intent.sql` | Model `UsdtDepositIntent` — vá lỗ hổng front-run TxID nạp USDT (buyer đặt trước số USDT định danh riêng, xem §11) |
| `2026-08-21-product-requires-expiry.sql` | `Product.requiresExpiryStock` — loại "Tài khoản AI" tách UI khỏi Sản phẩm thường (vẫn `productType=PRODUCT`+`AUTO_STOCK`), ép server bắt buộc `ProductStockItem.expiresAt` cho mọi lô kho khi bật cờ này |
| `2026-08-24-deposit-code-expiry.sql` | `WalletTransaction.depositCode` (UNIQUE có điều kiện) + `expiresAt` — làm lại luồng nạp ngân hàng thành wizard 3 bước với QR VietQR auto-fill, mã CK sinh ở server thay vì client (xem §11) |
| `2026-08-24-dvnet-webhook.sql` | Unique index chống trùng nạp USDT qua cổng DV.net (non-custodial) — provider thứ 2 song song TronGrid, chọn qua `PaymentConfig "usdt_provider"` |
| `2026-08-25-seller-level.sql` | 4 cột `Seller.levelOverride/levelDowngradePendingTo/levelDowngradePendingSince/levelRecomputedAt` + model `SellerLevelConfig`/`SellerLevelSetting`/`SellerLevelHistory` + index `OrderItem(sellerId,status,createdAt)` — hệ thống hạng người bán tính tự động từ dữ liệu thật (đơn hoàn thành theo buyer khác nhau, rating, tỉ lệ khiếu nại), thay số tĩnh cũ |
| `2026-08-25-product-warranty-policy.sql` | `Product.warrantyPolicy` (TEXT, nullable) — chính sách bảo hành dạng text tự do seller viết lúc đăng, KHOÁ vĩnh viễn ngay khi sản phẩm có đơn đầu tiên (chặn ở server, chống hạ chính sách sau khi buyer đã mua) |
| `2026-08-28-member-code.sql` | `User.memberCode` (TEXT, UNIQUE, nullable) + model `MemberCodeCounter` (singleton, bộ đếm tuần tự) — mã thành viên ngắn "MMO000001..." cho admin tra cứu, gán cố định lúc đăng ký |

> Khi thêm schema mới: tạo file `prisma/pending-sql/YYYY-MM-DD-mo-ta-ngan.sql`,
> để user tự chạy trên Neon, rồi mới cập nhật `schema.prisma` + chạy `npx
prisma generate` (KHÔNG `db push`/`migrate` nhắm vào Neon). Sau khi hoàn
> thành, thêm 1 dòng vào bảng trên.
