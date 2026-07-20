# PROJECT_MAP.md — Bản đồ kiến trúc MarketMMO

> Tài liệu này được tạo bằng cách **đọc code thật** (không suy đoán). Stack:
> Next.js 16 App Router + React 19 + TypeScript, `src/` + alias `@/*`,
> Prisma + PostgreSQL, Auth.js (next-auth v5 beta), Tailwind v4.
>
> Ngày rà soát: phản ánh trạng thái code tại thời điểm đọc. Nếu code đổi,
> tài liệu này cần cập nhật lại.

---

## 1. Kiến trúc

### 1.1 Tổng quan

- **Framework**: Next.js 16 App Router. Mọi backend chạy qua **Route Handlers**
  (`app/api/**/route.ts`). **KHÔNG có Server Action nào** (`grep '"use server"'`
  = 0 kết quả). **KHÔNG có `middleware.ts`** — không có lớp chặn request toàn
  cục; mọi kiểm tra quyền nằm trong từng route/page (xem mục 2, 4).
- **Config**: `next.config.ts` chỉ khai báo `images.remotePatterns` cho
  `*.public.blob.vercel-storage.com` (ảnh sản phẩm trên Vercel Blob). Có
  `vercel.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`.
- **Root layout** (`src/app/layout.tsx`, Server Component): nạp font Geist,
  bọc toàn app trong `<Providers>` = `SessionProvider` (next-auth/react) +
  `CartProvider` (giỏ hàng client, `src/context/CartContext.tsx`).

### 1.2 Cây thư mục `src/`

```
src/
  auth.ts                       # Cấu hình NextAuth (Credentials + Google), callbacks jwt/session
  middleware — KHÔNG CÓ
  types/next-auth.d.ts          # Mở rộng type Session/JWT: id, role, walletBalance, banned

  app/
    layout.tsx                  # Root layout (Server) — Providers wrapper
    page.tsx                    # Trang chủ (Server, force-dynamic)
    globals.css                 # Tailwind v4 tokens + theme admin (.admin-shell)

    # ─── Trang công khai (Server Components trừ khi ghi chú) ───
    danh-muc/[slug]/page.tsx    # Trang danh mục (Server, dynamic)
    san-pham/[slug]/page.tsx    # Chi tiết sản phẩm (Server, dynamic)
    shop/[seller]/page.tsx      # Gian hàng seller (Server) — 404 nếu seller.suspended (trừ chủ shop)
    nguoi-ban/page.tsx          # Danh sách seller (Server)
    tim-kiem/page.tsx           # Tìm kiếm sản phẩm (Server)
    dau-gia/page.tsx            # Đấu giá vị trí vàng (Server)
    dien-dan/page.tsx           # Diễn đàn (Server)
    dien-dan/[postId]/page.tsx  # Chi tiết bài viết diễn đàn (Server)
    lay-2fa/page.tsx            # Công cụ TOTP (Server shell + TotpTool client)
    cau-hoi-thuong-gap, chinh-sach-bao-mat, dieu-khoan-ban-hang,
    dieu-khoan-dich-vu, sitemap-trang-web, tai-lieu-api/page.tsx  # Trang tĩnh (Server)

    # ─── Auth ───
    dang-nhap/page.tsx          # Server shell → AuthForms (client)
    quen-mat-khau/page.tsx      # Server shell → ForgotPasswordForm (client)
    dat-lai-mat-khau/page.tsx   # Server shell → ResetPasswordForm (client, đọc ?token=)

    # ─── Yêu cầu đăng nhập (Server, tự guard hoặc redirect) ───
    gio-hang/page.tsx           # ⚠ CLIENT COMPONENT ("use client") — giỏ hàng dùng CartContext
    nap-tien/page.tsx           # Ví/nạp tiền (Server → DepositPanel client)
    don-hang/page.tsx           # Lịch sử đơn hàng (Server, redirect nếu chưa login)
    affiliate/page.tsx          # Affiliate (Server, yêu cầu login)
    tin-nhan/page.tsx           # Chat (Server shell → ChatInbox client)
    tro-thanh-nguoi-ban/page.tsx # Đăng ký bán hàng (Server → SellerRegisterForm client)
    quan-ly-san-pham/page.tsx   # Quản lý biến thể sản phẩm (Server → ProductVariantManager)

    # ─── Quản Lý Bán Hàng (SELLER/ADMIN) — nested layout guard ───
    trang-ban-hang/layout.tsx   # GUARD: redirect nếu chưa login → /dang-nhap;
                                #        redirect nếu không phải seller → /tro-thanh-nguoi-ban.
                                #        Render Header/Footer site + SellerSidebar.
    trang-ban-hang/page.tsx             # Tổng quan (doanh thu theo khoảng ngày)
    trang-ban-hang/san-pham/page.tsx    # Đăng SP mới + quản lý biến thể/kho
    trang-ban-hang/don-san-pham|don-dich-vu/page.tsx  # Đơn theo loại category
    trang-ban-hang/dat-truoc, ma-giam-gia, rut-tien, quy-bao-hiem,
    trang-ban-hang/khieu-nai, danh-gia, telegram-bot/page.tsx

    # ─── Admin Control Center (ADMIN) — nested layout guard + theme tối riêng ───
    admin/layout.tsx            # GUARD: redirect /dang-nhap nếu chưa login;
                                #        redirect / nếu role !== ADMIN.
                                #        KHÔNG dùng Header/Footer site — shell riêng + AdminSidebar.
    admin/page.tsx              # Tổng quan (KPI, biểu đồ GMV, hoạt động gần đây)
    admin/nguoi-dung, nguoi-ban, don-hang, san-pham, danh-muc, dien-dan,
    admin/nap-tien, rut-tien, tai-chinh, khieu-nai, dau-gia, nhat-ky, cai-dat/page.tsx

    api/**/route.ts             # Toàn bộ backend — xem mục 2

  components/                   # ~120 file — 58 file "use client" (form, panel, widget tương tác);
                                # phần còn lại Server Component (thẻ hiển thị, layout).
                                # components/admin/*  = UI riêng cho Admin (theme tối --adm-*)

  context/CartContext.tsx       # ⚠ CLIENT — giỏ hàng lưu localStorage (key marketmmo_cart)

  data/
    categories.ts, products.ts  # Nguồn seed + type Product/Category (KHÔNG query trực tiếp trong trang)

  lib/                          # Logic dùng chung — xem mục 5, 6
    prisma.ts       # PrismaClient singleton
    auth ... (src/auth.ts ở root, không trong lib)
    authz.ts        # requireUser/requireSeller/requireAdmin + getAuthSession/getSellerForUser (cached)
    constants.ts    # Union types (Role, OrderStatus...) + hằng số nghiệp vụ
    queries.ts      # Toàn bộ hàm đọc Prisma (map về type UI)
    discount.ts     # computeDiscountAmount / distributeDiscount / isDiscountCodeUsable
    auction.ts      # resolveAuctionSlot() — chọn người thắng, trừ ví, xoay vòng slot
    audit.ts        # logAdminAction() — ghi AdminAuditLog (không throw nếu lỗi)
    referral.ts     # generateReferralCode / ensureReferralCode
    system-bot.ts   # Bot "Hệ Thống" + getOrCreateConversation + sendSystemMessage
    forum.ts        # getForumPosts / getForumPostById (lọc hidden=false)
    email.ts        # sendPasswordResetEmail (Resend, env-gated)
    telegram.ts     # sendTelegramMessage / generateLinkCode (env-gated)
    turnstile.ts    # verifyTurnstileToken (env-gated)
    uploads.ts      # saveProductImage / saveChatAttachment / readUploadedFile (Vercel Blob ↔ đĩa)
    payment/vnpay.ts    # createVnpayPaymentUrl / verifyVnpayReturn (HMAC-SHA512)
    payment/deposit.ts  # getBankInfo / getUsdtInfo (đọc env)
    slug.ts, format.ts, totp.ts, categoryIcons.tsx
```

### 1.3 Quy ước Server vs Client

- **Mặc định Server Component**: mọi `page.tsx`/`layout.tsx` trừ khi có
  `"use client"`. Trang duy nhất là Client Component ở cấp page:
  **`app/gio-hang/page.tsx`** (giỏ hàng cần `CartContext`).
- **58 Client Components** (đánh dấu `"use client"`) — toàn bộ form, panel
  tương tác, widget polling. Danh sách đầy đủ: mọi `Auth*/Seller*/Admin*Panel`,
  `BuyBox`, `ChatInbox`, `DepositPanel`, `CartContext`, `RevenueChart`,
  `ForumLikeButton`, `TurnstileWidget`, v.v.
- **Data fetching**: Server Components gọi thẳng `src/lib/queries.ts` (Prisma).
  Client Components gọi API route qua `fetch`.

---

## 2. Điểm vào backend — TẤT CẢ Route Handlers

> **Không có Server Action.** Mọi mutation/đọc dữ liệu qua Route Handlers dưới.
> Cột "Quyền" = guard thực tế trong code. Ghi chú các nuance bảo mật ở mục 4.7.

### 2.1 Công khai (KHÔNG guard đăng nhập)

| Method | Route | Chức năng |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Handler NextAuth (đăng nhập/đăng xuất Credentials + Google) |
| POST | `/api/auth/register` | Tạo tài khoản role BUYER. Validate username `^[a-zA-Z0-9]{3,20}$`, email, mật khẩu ≥6. **Bắt buộc Turnstile**. `refCode` optional → gắn `referredById`. Sinh `referralCode`. Gửi tin chào mừng qua bot Hệ Thống. |
| POST | `/api/auth/forgot-password` | Tạo `PasswordResetToken` (lưu **SHA-256 hash**, token gốc chỉ trong link email). Gửi qua Resend. **Luôn trả message chung chung** (không lộ email tồn tại). Chỉ xử lý nếu user có `passwordHash` (bỏ qua tài khoản Google). Xoá token cũ chưa dùng. |
| POST | `/api/auth/reset-password` | Verify token (hash + hạn + chưa dùng) → đổi `passwordHash`, đánh dấu `usedAt`. |
| GET | `/api/payment/vnpay/return` | Callback VNPay redirect về. **Tự verify chữ ký HMAC-SHA512** trước khi tin. Nếu `vnp_ResponseCode==="00"` → cộng ví + tx CONFIRMED; ngược lại REJECTED. Redirect `/nap-tien?status=...`. |
| POST | `/api/discount-codes/preview` | **Chỉ xem trước** số tiền giảm — KHÔNG tăng `usedCount`, KHÔNG đụng tiền. Checkout tính lại độc lập (chống giả mạo). |
| POST | `/api/tools/check-facebook` | Công cụ kiểm tra tài khoản Facebook sống/chết (tiện ích public). |
| POST | `/api/tools/check-proxy` | Công cụ kiểm tra proxy. **Chặn SSRF**: từ chối IP private/loopback/link-local, chỉ nhận IPv4 công khai, không resolve hostname. |

### 2.2 `requireUser()` — bất kỳ user đã đăng nhập & **không bị ban**

| Method | Route | Chức năng |
|---|---|---|
| POST | `/api/checkout` | Tạo Order/OrderItem status ESCROW trong `$transaction`: claim kho thật (`FOR UPDATE SKIP LOCKED`), trừ ví, giảm kho, áp mã giảm giá (+`usedCount`), cộng hoa hồng affiliate 10%. (Đã chuyển sang `requireUser()` → chặn banned — xem 4.7.) |
| POST | `/api/auction/bids` | Seller đặt giá đấu vị trí vàng cho SP của chính mình. Kiểm tra `≥ floorPrice`, `>` giá cao nhất, đủ số dư ví (chưa trừ tiền). |
| POST | `/api/disputes` | Buyer **hoặc** seller của OrderItem mở khiếu nại (chỉ khi status ESCROW). Chuyển OrderItem → DISPUTED, tạo Dispute OPEN. |
| POST | `/api/forum/posts` | Đăng bài diễn đàn. |
| POST | `/api/forum/posts/[postId]/comments` | Bình luận bài viết. |
| POST | `/api/forum/posts/[postId]/like` | Toggle thích/bỏ thích (unique postId+userId). |
| POST | `/api/forum/report` | Báo cáo 1 bài viết HOẶC 1 bình luận (đúng 1 trong 2 id). Tạo ForumReport OPEN. |
| GET | `/api/messages/conversations` | Danh sách hội thoại của user (verify qua userAId/userBId). |
| POST | `/api/messages/conversations` | get-or-create hội thoại với `targetUserId`. |
| GET | `/api/messages/conversations/[id]` | Đọc tin nhắn — **verify user là 1 trong 2 người tham gia** (404 nếu không). Đánh dấu đã đọc. |
| POST | `/api/messages/conversations/[id]` | Gửi tin (FormData: content + file đính kèm tuỳ chọn). Verify participant. |
| GET | `/api/messages/attachments/[messageId]` | Đọc ảnh/file đính kèm — verify người gọi thuộc đúng hội thoại. |
| GET | `/api/messages/unread-count` | Tổng số tin chưa đọc (Header poll 15s). |
| POST | `/api/payment/vnpay/create` | Tạo tx DEPOSIT PENDING + URL VNPay đã ký. Chặn nếu VNPay chưa cấu hình. Tối thiểu 10.000đ. |
| POST | `/api/reviews` | Đánh giá seller 1-5 sao. **Chỉ khi đã mua hàng từ seller đó** (`orderItem.findFirst`). Upsert theo (sellerId, userId). |
| POST | `/api/seller/register` | Tạo Seller record + nâng role → SELLER trong `$transaction`. Slug tự sinh. Gửi tin chúc mừng. |
| POST | `/api/wallet/deposit-request` | Tạo tx DEPOSIT **PENDING** (nạp thủ công bank/usdt). Chưa cộng ví. USDT bắt buộc `gatewayRef` (TxID). Tối thiểu 10.000đ. |
| GET | `/api/wallet/transactions` | Lịch sử giao dịch ví của user hiện tại. |

### 2.3 `requireSeller()` — có Seller record & **không bị ban** (KHÔNG chặn `suspended`)

| Method | Route | Chức năng |
|---|---|---|
| GET/POST | `/api/seller/products` | GET: SP của chính seller (mọi status). POST: đăng SP gốc mới — status **PENDING**, upload ảnh (`saveProductImage`), cần admin duyệt. |
| PATCH | `/api/seller/products/[productId]` | Bật/tắt `preOrder` cho SP của mình (kiểm tra `sellerId`). |
| POST | `/api/seller/products/[productId]/stock` | Nhập hàng loạt kho giao hàng thật (ProductStockItem), mỗi dòng = 1 đơn vị. |
| POST | `/api/seller/products/[productId]/variants` | Thêm biến thể (label/price/stock). |
| PATCH/DELETE | `/api/seller/products/[productId]/variants/[variantId]` | Sửa/xoá biến thể. DELETE dọn ProductStockItem AVAILABLE trước khi xoá. |
| POST | `/api/seller/categories` | Đề xuất danh mục mới — status PENDING (dùng ngay được, ẩn công khai tới khi admin duyệt). Chặn trùng tên. |
| GET/POST | `/api/seller/discount-codes` | Danh sách/tạo mã giảm giá của seller. |
| PATCH/DELETE | `/api/seller/discount-codes/[id]` | Bật-tắt/xoá mã — verify `sellerId` (`loadOwnedCode`). |
| POST/GET | `/api/seller/withdraw-request` | POST: tạo yêu cầu rút tiền — **TRỪ VÍ NGAY** trong `$transaction` (throw nếu không đủ), tx WITHDRAW amount âm PENDING, note chứa thông tin ngân hàng. GET: lịch sử. |
| POST/GET | `/api/seller/insurance-deposit` | POST: nạp quỹ bảo hiểm — **tự động duyệt ngay** (chuyển nội bộ ví → `insuranceBalance`), tx INSURANCE_DEPOSIT CONFIRMED. GET: lịch sử. |
| GET/POST | `/api/seller/telegram` | GET: trạng thái liên kết. POST `{action:"link"\|"confirm"\|"unlink"\|"test"}` — env-gated `TELEGRAM_BOT_TOKEN`. |

### 2.4 `requireAdmin()` — role ADMIN (⚠ KHÔNG kiểm tra `banned`)

| Method | Route | Chức năng |
|---|---|---|
| GET | `/api/admin/deposits` · `/withdrawals` · `/disputes` · `/products` · `/categories` · `/forum-reports` | Danh sách hàng chờ tương ứng. |
| POST | `/api/admin/deposits/[id]` | `{action:"approve"\|"reject"}` — approve: cộng ví + CONFIRMED; reject: REJECTED. Ghi audit. |
| POST | `/api/admin/withdrawals/[id]` | approve: chỉ CONFIRMED (ví đã trừ lúc tạo); reject: **hoàn tiền** (`increment` abs(amount)) + REJECTED. |
| POST | `/api/admin/disputes/[id]` | `refund_buyer`: OrderItem→CANCELLED, hoàn 100% ví buyer (tx REFUND). `release_seller`: OrderItem→RELEASED, cộng ví seller (tx PAYOUT). Không có hoàn tiền một phần. |
| POST | `/api/admin/escrow/release` | Quét mọi OrderItem ESCROW đến hạn (`escrowReleaseAt<=now`) → RELEASED + cộng ví seller (tx PAYOUT). Chưa có cron tự động. |
| POST | `/api/admin/products/[id]` | `{action:"approve"\|"reject", adminNote?}` — duyệt/từ chối SP PENDING. |
| POST | `/api/admin/categories/[id]` | Duyệt/từ chối danh mục PENDING. |
| POST | `/api/admin/forum-reports/[id]` | `hide`: set `hidden=true` cho post/comment + RESOLVED_HIDDEN; `dismiss`: RESOLVED_DISMISSED. |
| GET | `/api/admin/users?q=` | Tìm user theo email/username/tên (≤50). |
| PATCH | `/api/admin/users/[id]` | `{action:"ban"\|"unban", reason?}`. **Chặn ban role ADMIN** (400). |
| GET | `/api/admin/sellers?q=` | Tìm gian hàng. |
| PATCH | `/api/admin/sellers/[id]` | `suspend/unsuspend` (khoá gian hàng) + `verify/unverify` (bật/tắt badge "Đã xác thực" thủ công). |
| GET | `/api/admin/sellers/[id]/products` | SP APPROVED của 1 seller (cho dropdown gán đấu giá). |
| GET | `/api/admin/auction/slots` | Toàn bộ slot + lịch sử bid (≤3 slot/vị trí). |
| PATCH | `/api/admin/auction/slots/[id]` | Sửa `floorPrice` (chỉ slot OPEN). |
| POST | `/api/admin/auction/slots/[id]/cancel-bids` | Xoá mọi AuctionBid của slot OPEN (không đụng ví — tiền chỉ trừ lúc thắng). |
| POST | `/api/admin/auction/slots/[id]/close-now` | Ép đóng 1 slot ngay (dùng `resolveAuctionSlot`). |
| POST | `/api/admin/auction/resolve` | Đóng mọi slot hết hạn (dùng chung `resolveAuctionSlot`). |
| POST | `/api/admin/auction/assign` | Gán thủ công SP APPROVED vào vị trí vàng, BỎ QUA đấu giá. Tuỳ chọn thu phí seller (kiểm tra đủ ví → trừ, tx PURCHASE). Đóng slot cũ + mở slot mới xoay vòng. |

> Mọi route admin gọi `logAdminAction()` ở cuối để ghi `AdminAuditLog`.

---

## 3. Prisma schema (`prisma/schema.prisma`)

- **DB**: PostgreSQL. Các field "enum" lưu dạng **String** + validate bằng
  union type TS ở `src/lib/constants.ts` (giá trị cho phép ghi ở comment đầu
  schema). Dự án dùng `prisma db push` (không có thư mục `migrations/`).

### 3.1 Danh sách model & quan hệ

| Model | Vai trò | Quan hệ chính |
|---|---|---|
| **User** | Người dùng (BUYER/SELLER/ADMIN) | 1-1 Seller; 1-n Order/WalletTransaction/Review/ForumPost/... ; self-relation "Referrals" (referredBy/referrals) |
| **PasswordResetToken** | Token quên mật khẩu (hash) | n-1 User (cascade) |
| **Account / Session / VerificationToken** | Chuẩn Auth.js (OAuth Google) | n-1 User |
| **Seller** | Gian hàng | 1-1 User; 1-n Product/Review/AuctionBid/DiscountCode; proposedCategories |
| **Category** | Danh mục | 1-n Product; proposedBy → Seller (SetNull) |
| **Product** | Sản phẩm | n-1 Category, n-1 Seller; 1-n OrderItem/AuctionBid/ProductVariant/ProductStockItem |
| **ProductVariant** | Biến thể/gói | n-1 Product (cascade); 1-n OrderItem/ProductStockItem |
| **ProductStockItem** | Kho giao hàng THẬT (1 dòng = 1 đơn vị nội dung) | n-1 Product (cascade), n-1 ProductVariant (SetNull), n-1 OrderItem (SetNull) |
| **Order** | Đơn hàng | n-1 User (buyer); 1-n OrderItem |
| **OrderItem** | Dòng đơn (đa seller/đơn) | n-1 Order (cascade)/Product/Variant; 1-1 Dispute; 1-n ProductStockItem |
| **Dispute** | Khiếu nại | 1-1 OrderItem (cascade); openedBy → User |
| **DiscountCode** | Mã giảm giá của seller | n-1 Seller (cascade) |
| **AuctionSlot / AuctionBid** | Đấu giá vị trí vàng | Slot 1-n Bid; Bid → Seller/Product |
| **Review** | Đánh giá seller (1-5 sao) | n-1 Seller/User; `@@unique([sellerId,userId])` |
| **ForumPost / ForumComment / ForumLike / ForumReport** | Diễn đàn + kiểm duyệt | Post 1-n Comment/Like/Report; Report → post? HOẶC comment? |
| **WalletTransaction** | Sổ cái ví (mọi biến động) | n-1 User |
| **Conversation / Message** | Chat | Conversation `@@unique([userAId,userBId])`; Message n-1 Conversation/sender |
| **AdminAuditLog** | Nhật ký thao tác admin | n-1 User (admin) |

### 3.2 ⚠ Field nhạy cảm / bảo mật

| Model.field | Ghi chú bảo mật |
|---|---|
| `User.passwordHash` | bcrypt hash (10 rounds). Nullable (tài khoản chỉ-Google không có). |
| `User.banned/bannedReason/bannedAt` | Khoá tài khoản — chặn đăng nhập ở `authorize()` + `requireUser/requireSeller`. |
| `User.walletBalance` | Số dư ví (Int VNĐ) — **số dư cache**, phải luôn cập nhật cùng `$transaction` với WalletTransaction. |
| `PasswordResetToken.tokenHash` | **SHA-256** của token gốc; token gốc chỉ trong link email. `@unique`, có `expiresAt`+`usedAt`. |
| `Account.refresh_token / access_token / id_token` | Token OAuth Google (do PrismaAdapter quản lý). |
| `Session.sessionToken` | Chỉ dùng khi strategy=database; ở đây strategy=**jwt** nên bảng này ít dùng. |
| `Seller.telegramChatId / telegramLinkCode` | Chat ID + mã xác nhận liên kết Telegram. |
| `WalletTransaction.gatewayRef` | TxID cổng thanh toán (VNPay/USDT). |
| `Message.attachmentPath` | Đường dẫn file đính kèm — **không public**, chỉ đọc qua route verify participant. |
| `Seller.verified` | Badge "Đã xác thực" — admin bật/tắt **thủ công** (không còn quy trình CCCD). |

---

## 4. Vai trò & ma trận quyền

### 4.1 Ba vai trò (`User.role`, `src/lib/constants.ts`)

- **BUYER** (mặc định khi đăng ký)
- **SELLER** (nâng lên khi `POST /api/seller/register`; kèm 1 Seller record)
- **ADMIN** (đặt thủ công qua DB/seed)

### 4.2 Guard trong API (`src/lib/authz.ts`)

| Hàm | Kiểm tra | Trả lỗi |
|---|---|---|
| `requireUser()` | đã đăng nhập **và** `!banned` | 401 chưa login / 403 banned |
| `requireSeller()` | đã đăng nhập, `!banned`, **có Seller record**, **`!suspended`** | 401 / 403 banned / 403 chưa là seller / 403 gian hàng bị khoá |
| `requireAdmin()` | đã đăng nhập, **`!banned`**, `role==="ADMIN"` | 401 / 403 banned / 403 không phải admin |

> `getAuthSession()` / `getSellerForUser()` (bọc `React.cache()`) dùng cho
> **Server Component** (page/layout), không dùng cho API route.

### 4.3 Guard trong Page/Layout (Server Components)

- `app/trang-ban-hang/layout.tsx`: chưa login → `/dang-nhap?callbackUrl=...`;
  không có Seller → `/tro-thanh-nguoi-ban`.
- `app/admin/layout.tsx`: chưa login → `/dang-nhap`; `role!=="ADMIN"` → `/`.
- `app/don-hang`, `app/affiliate`, `app/tin-nhan`... tự redirect nếu chưa login.

### 4.4 Ma trận quyền (rút gọn)

| Hành động | Khách | BUYER | SELLER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Xem SP/danh mục/shop/diễn đàn công khai | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / đăng nhập | ✅ | — | — | — |
| Mua hàng (checkout), nạp tiền, mở khiếu nại, đánh giá, chat, đăng bài diễn đàn | ❌ | ✅ | ✅ | ✅ |
| Đăng ký bán hàng | ❌ | ✅ | (đã là) | ✅ |
| Đăng SP/variant/kho, mã giảm giá, rút tiền, quỹ bảo hiểm, đấu giá, Telegram | ❌ | ❌ | ✅ | ✅* |
| Duyệt nạp/rút/SP/danh mục, giải ngân ký quỹ, xử lý khiếu nại, ban/suspend, đấu giá admin | ❌ | ❌ | ❌ | ✅ |

> \* ADMIN gọi được route `/api/seller/*` **chỉ khi** cũng có Seller record
> (`requireSeller` yêu cầu Seller, không phải role). Thực tế admin thường không có.

### 4.5 Enforcement khoá tài khoản (`banned`)

- Đăng nhập mới: `authorize()` throw `BannedSignin` (Credentials). **Google
  OAuth không đi qua bước này** → tài khoản Google bị ban vẫn có thể tạo phiên
  (ghi rõ trong comment schema).
- Phiên đang mở: callback `jwt()` đọc lại `banned` mỗi lần refresh → `requireUser/
  requireSeller` chặn trong vài phút.

### 4.6 Enforcement khoá gian hàng (`Seller.suspended`)

- Query công khai (`getAllProducts`, `getFeaturedProducts`, `getProductBySlugDb`,
  `getProductsByCategory`, `searchProducts`, `getRelatedProductsDb`,
  `getAllSellersWithStats`) lọc `seller.suspended=false`.
- `/shop/[seller]` trả 404 cho khách khi suspended (chủ shop vẫn xem được).
- ✅ **API `/api/seller/*` chặn suspended** (`requireSeller` trả 403 khi
  `seller.suspended`) → seller bị suspend KHÔNG thao tác được backend (đăng SP,
  rút tiền, đấu giá...). Vẫn dùng được luồng user thường (chat/diễn đàn/mua
  hàng) vì các luồng đó qua `requireUser`, không phải `requireSeller`.
- Dashboard `/trang-ban-hang` hiện **banner cảnh báo** khi suspended (layout đọc
  `seller.suspended`).

### 4.7 ✅ Các fix bảo mật đã áp dụng (trước đây là nuance)

1. **`/api/checkout` đã chuyển sang `requireUser()`** (không còn `await auth()`
   trực tiếp) → **chặn `banned`** như mọi route khác. User bị ban không checkout được.
2. **`requireAdmin()` đã kiểm tra `banned`** (defense-in-depth) — dù route ban
   vẫn chặn không cho ban `role==="ADMIN"`.
3. **`requireSeller()` đã kiểm tra `suspended`** — xem 4.6.
4. Tools `/api/tools/*` **công khai** (chủ đích) — `check-proxy` có chống SSRF;
   `check-facebook` chỉ fetch URL Facebook công khai.
5. ⚠ **Còn tồn tại**: tài khoản đăng nhập bằng **Google OAuth không bị chặn bởi
   `banned` ở BƯỚC đăng nhập** (chỉ Credentials qua `authorize()`). Tuy nhiên
   phiên tạo ra bị vô hiệu hoá thực tế vì callback `jwt()` đọc lại `banned` từ
   DB → `requireUser/requireSeller/requireAdmin` chặn mọi hành động. Muốn chặn
   ngay từ bước tạo phiên cần thêm `signIn` callback trong `src/auth.ts`.

---

## 5. Các luồng chính

### 5.1 Đăng ký / Đăng nhập

- **Cấu hình**: `src/auth.ts` — NextAuth v5, `session.strategy = "jwt"`,
  `PrismaAdapter`, `pages.signIn = "/dang-nhap"`.
- **Credentials provider**: field `email` nhận **email HOẶC username**
  (`findFirst OR`). Bắt buộc Turnstile (`verifyTurnstileToken`). So bcrypt.
  Throw `BannedSignin` nếu `user.banned`. Trả `{id, email, name, image, role,
  walletBalance, banned}`.
- **Google provider**: chỉ đăng ký khi có `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`.
- **Callbacks**: `jwt()` nạp `id/role/walletBalance/banned` vào token; nhánh
  refresh đọc lại role/balance/banned từ DB + cập nhật `lastActiveAt` (throttle
  2 phút). `session()` copy các field đó vào `session.user`.
- **Đăng ký** (`POST /api/auth/register`): validate + Turnstile → tạo User
  BUYER + `referralCode` + `referredById` (nếu refCode hợp lệ) → tin chào mừng.
  Client sau đó tự `signIn("credentials")`.

### 5.2 Đăng sản phẩm

1. Seller `POST /api/seller/products` (FormData: name, categoryId,
   shortDescription, description nhiều dòng, price≥1000, stock, **ảnh**).
2. Ảnh lưu qua `saveProductImage()` (Blob public hoặc `/public/uploads/products/`).
3. Tạo Product **status="PENDING"**, slug tự sinh.
4. Admin `POST /api/admin/products/[id]` `approve/reject` → APPROVED mới hiện
   công khai (mọi query công khai lọc `status="APPROVED"`).
5. (Tuỳ chọn) seller thêm variant + nhập kho thật (`.../variants`, `.../stock`).

### 5.3 Đặt hàng / Checkout (`POST /api/checkout`)

Toàn bộ trong 1 `prisma.$transaction`:
1. Nạp Product + variants. Với mỗi item: xác định giá (variant bắt buộc nếu SP
   có variant), tính `total`.
2. **Kho thật**: nếu `COUNT(ProductStockItem)>0` → `SELECT ... FOR UPDATE SKIP
   LOCKED LIMIT quantity` để claim, đánh dấu SOLD ngay, ghép nội dung vào
   `deliveredPayload`. Không đủ → throw. Áp dụng kể cả `preOrder`.
   Ngược lại (chưa dùng kho thật): kiểm tra `Product/Variant.stock` (bỏ qua nếu `preOrder`).
3. **Mã giảm giá**: validate + chia đều cho dòng hàng đúng seller
   (`src/lib/discount.ts`), tăng `usedCount` trong cùng transaction (chống race).
4. Kiểm tra `walletBalance >= total` → tạo Order + từng OrderItem (status ESCROW,
   `escrowReleaseAt = now + 3 ngày`), gắn `orderItemId` cho stock đã claim, giảm
   kho/tăng sold, trừ ví, tạo tx PURCHASE.
5. **Hoa hồng affiliate**: nếu buyer có `referredById` **và** đã từng có ≥1 tx
   DEPOSIT CONFIRMED → cộng `10% × total` (`REFERRAL_COMMISSION_PERCENT=0.1`)
   vào ví người giới thiệu (tx REFERRAL_BONUS). **Áp dụng MỌI đơn**, không chỉ
   đơn đầu. (Lưu ý: `User.referralRewarded` KHÔNG được set trong code checkout
   hiện tại — comment schema mô tả cơ chế cũ.)
6. Giải ngân: `POST /api/admin/escrow/release` (admin, chưa có cron) chuyển
   ESCROW đến hạn → RELEASED + cộng ví seller (tx PAYOUT).

### 5.4 Nạp tiền — VNPay & thủ công

- **VNPay** (env-gated `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET`):
  `POST /api/payment/vnpay/create` → tx DEPOSIT PENDING + URL ký HMAC-SHA512
  (`createVnpayPaymentUrl`, encode kiểu form-urlencoded, `%20`→`+`). VNPay
  redirect `GET /api/payment/vnpay/return` → **verify chữ ký** →
  `vnp_ResponseCode==="00"` cộng ví + CONFIRMED.
- **Thủ công** (bank/USDT, `src/lib/payment/deposit.ts`):
  `POST /api/wallet/deposit-request` → tx DEPOSIT **PENDING** (chưa cộng ví).
  Admin `POST /api/admin/deposits/[id]` approve → cộng ví. Bank hiện số TK từ
  env (`BANK_*`, có QR VietQR nếu có `BANK_BIN`); USDT bắt buộc TxID
  (`gatewayRef`), env `USDT_TRC20_ADDRESS`/`USDT_VND_RATE`.
- **Rút tiền**: `POST /api/seller/withdraw-request` **trừ ví ngay** (PENDING).
  Admin approve (chỉ CONFIRMED) / reject (**hoàn ví**).

### 5.5 Quên mật khẩu (Resend)

`/quen-mat-khau` → `POST /api/auth/forgot-password`: tạo token (SHA-256 hash
lưu DB, gốc gửi email qua `sendPasswordResetEmail`), link `/dat-lai-mat-khau?
token=...` hạn 60 phút. Thiếu `RESEND_API_KEY` → **log link ra console** thay
vì gửi. `/dat-lai-mat-khau` → `POST /api/auth/reset-password` verify + đổi mật khẩu.

### 5.6 Upload ảnh (Vercel Blob) — `src/lib/uploads.ts`

- **Có `BLOB_READ_WRITE_TOKEN`**: lưu Vercel Blob (`put`, `access:"public"`,
  `addRandomSuffix:true`).
- **Thiếu token** (dev): ảnh **sản phẩm** ghi `/public/uploads/products/` (public
  static); file **chat** ghi `/uploads/` ở root (NGOÀI /public, không commit).
- **Ảnh sản phẩm** (`saveProductImage`): public, dùng thẳng trong `<Image>`.
  JPEG/PNG/WebP ≤5MB.
- **Đính kèm chat** (`saveChatAttachment`): ảnh ≤5MB / file tài liệu (PDF/DOC(X)/
  XLS(X)/ZIP/TXT) ≤10MB — **chặn mọi định dạng khác** (chống mã độc). Đọc qua
  route verify participant (`readUploadedFile`).

### 5.7 Thông báo Telegram — `src/lib/telegram.ts`

Env-gated `TELEGRAM_BOT_TOKEN`. Liên kết **không cần webhook**: seller tự lấy
Chat ID → `POST /api/seller/telegram {action:"link"}` gửi mã 6 số → `confirm`
nhập lại mã → `test` gửi tin thử / `unlink`. `sendTelegramMessage` gọi Bot API
outbound. (Chưa nối tự động vào sự kiện đơn hàng/khiếu nại.)

### 5.8 Bot "Hệ Thống" / Chat (`src/lib/system-bot.ts`)

Bot là 1 User bình thường (upsert theo `system@marketmmo.internal`, không
passwordHash). `sendSystemMessage` gọi ở 2 nơi: đăng ký tài khoản + đăng ký
bán hàng. Chat polling (danh sách 15s, tin nhắn 7s) — không WebSocket.

---

## 6. Biến môi trường (đọc từ `.env.example` + `grep process.env`)

| Biến | Bắt buộc? | Ý nghĩa / hành vi khi thiếu |
|---|---|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL (dev: Docker cổng 5433). |
| `AUTH_SECRET` | ✅ | Secret ký JWT của NextAuth. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ⬜ | Bật provider Google. Thiếu → ẩn nút "Đăng nhập với Google". |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ⬜ | Site key Turnstile (client). Thiếu → không hiện widget. |
| `TURNSTILE_SECRET_KEY` | ⬜ | Secret Turnstile (server). Thiếu → `verifyTurnstileToken` luôn trả `true` (bỏ qua xác minh). |
| `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` | ⬜ | Merchant VNPay. Thiếu → `isVnpayConfigured()` false, chỉ cho nạp thủ công. |
| `VNPAY_URL` | ⬜ | Endpoint VNPay (mặc định sandbox). |
| `VNPAY_RETURN_URL` | ⬜ | URL callback (mặc định `http://localhost:3000/api/payment/vnpay/return`). |
| `BANK_NAME` / `BANK_ACCOUNT_NUMBER` / `BANK_ACCOUNT_HOLDER` | ⬜ | Thông tin nhận CK ngân hàng. Thiếu → vẫn nhận yêu cầu nạp nhưng không hiện số TK. |
| `BANK_BIN` | ⬜ | Mã ngân hàng Napas → tạo QR VietQR động. Thiếu → chỉ hiện số TK dạng chữ. |
| `USDT_TRC20_ADDRESS` / `USDT_VND_RATE` | ⬜ | Địa chỉ ví + tỷ giá nạp USDT TRC20. Thiếu → tắt kênh USDT. |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Bot Telegram. Thiếu → tính năng Telegram tự disable. |
| `RESEND_API_KEY` | ⬜ | Gửi email (quên mật khẩu) qua Resend. Thiếu → log link reset ra console. |
| `RESEND_FROM_EMAIL` | ⬜ | Địa chỉ gửi (mặc định sandbox `onboarding@resend.dev`). |
| `BLOB_READ_WRITE_TOKEN` | ⬜ (✅ trên Vercel) | Vercel Blob lưu ảnh/file. Thiếu → ghi ổ đĩa cục bộ (mất trên serverless). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ⬜ | Tài khoản admin tạo bởi `prisma/seed.ts` (không dùng trong `src/`). |
| `NODE_ENV` | (Next tự đặt) | Dùng cho logic môi trường. |

> **Quy ước env-var-gated** xuyên suốt dự án: mọi tích hợp bên thứ 3 (VNPay,
> Google, Turnstile, Resend, Telegram, Blob, USDT) tự ẩn/disable khi thiếu key,
> **không chặn phần còn lại của app** — cho phép chạy dev đầy đủ mà không cần
> đăng ký dịch vụ thật.

---

## Phụ lục — Trạng thái các phát hiện (từ đọc code, không suy đoán)

1. ✅ **ĐÃ FIX**: `POST /api/checkout` chuyển sang `requireUser()` → chặn `banned`.
2. ✅ **ĐÃ FIX**: `requireAdmin()` kiểm tra `banned`; `requireSeller()` kiểm tra
   `suspended` (mục 4.5, 4.6, 4.7). Kèm banner cảnh báo ở dashboard seller.
3. ⚠ **CHƯA XỬ LÝ (không phải bug bảo mật)**: **Hoa hồng affiliate = 10% MỖI đơn**
   (`REFERRAL_COMMISSION_PERCENT=0.1`, comment đánh dấu là giá trị tạm/placeholder),
   khác mô tả cũ "20.000đ/đơn đầu" trong tài liệu khác. Code checkout **không**
   set `User.referralRewarded`. → cần chốt lại giá trị % chính thức.
4. ⚠ **CÒN TỒN TẠI (nhẹ)**: tài khoản Google OAuth không bị chặn `banned` ở bước
   đăng nhập, nhưng phiên bị vô hiệu hoá thực tế bởi các guard (mục 4.7.5).
5. Không có `middleware.ts` và không có Server Action — toàn bộ auth nằm rải
   trong từng route/layout; cần cẩn trọng khi thêm route mới (dễ quên guard).
