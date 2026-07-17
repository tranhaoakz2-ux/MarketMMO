# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo **MarketMMO**.

## Tổng quan dự án

MarketMMO là một website **marketplace** giới thiệu và bán các sản phẩm/dịch vụ số:

- Tài khoản số (Gmail, Facebook, Discord, TikTok, YouTube, v.v.)
- Vật phẩm / tiền tệ trong game MMO (gold, item, account game)
- Dịch vụ boosting / cày thuê (leveling, rank boost)

Dự án đã được scaffold bằng Next.js (App Router) + TypeScript + Tailwind CSS,
với các trang chính (trang chủ, danh mục, chi tiết sản phẩm, đăng nhập/đăng ký,
gian hàng người bán, ví/nạp tiền, giỏ hàng, lịch sử đơn hàng) hiện thực theo
thiết kế thật của shopmini.pro (không chỉ ảnh tham khảo tĩnh
`shopmini.pro__category=Gmail.png`, mà đã đối chiếu trực tiếp với các trang
sống trên shopmini.pro — xem mục "Quy tắc bắt buộc"). Backend **thật** đã được
xây dựng (Prisma + PostgreSQL, Auth.js, checkout trừ ví có ký quỹ, ví/nạp tiền,
đăng ký người bán, trang quản trị) — xem mục "Backend" bên dưới. File này là
kim chỉ nam khi tiếp tục phát triển — cập nhật khi có thay đổi lớn về tech
stack, cấu trúc thư mục, hoặc quy ước code.

## Thông tin công ty / thương hiệu tham khảo

Thông tin dưới đây tổng hợp từ shopmini.pro (nguồn tham khảo mô hình kinh doanh —
cùng lĩnh vực "sàn mua bán tài khoản MMO"), dùng để định hướng nội dung, tính năng
và các trang pháp lý cho MarketMMO:

- **Định vị**: sàn giao dịch tài khoản/dịch vụ MMO uy tín, giao dịch tự động, có
  cơ chế **ký quỹ (escrow)** bảo vệ người mua/bán (ví dụ: giữ tiền ~3 ngày trước
  khi giải ngân cho người bán) thay cho trung gian truyền thống.
- **Mô hình vận hành**: nạp tiền vào ví trước ("Nạp tiền"), sau đó mua sản phẩm
  bằng số dư ví; giao hàng/kích hoạt **tự động 24/7**.
- **Đây là marketplace multi-vendor**: có luồng "Trở thành người bán" cho phép
  bên thứ ba đăng bán sản phẩm/dịch vụ, kèm cơ chế xác minh người bán.
- **Tính năng nổi bật cần cân nhắc cho MarketMMO**:
  - Ví/nạp tiền (Deposit) + lịch sử mua hàng (Order history)
  - Chương trình giới thiệu/kiếm tiền (referral/affiliate)
  - Công cụ lấy mã 2FA cho tài khoản đã mua
  - Diễn đàn/cộng đồng (Forum)
  - Tài liệu API cho nhà phát triển/đối tác
- **Trang pháp lý/nội dung cần có**: Câu hỏi thường gặp (FAQ), Điều khoản dịch vụ,
  Điều khoản bán hàng (dành cho người bán), Chính sách bảo mật, Sitemap.
- **Kênh liên hệ**: hỗ trợ qua chat trực tuyến trên site + mạng xã hội (Facebook,
  TikTok); trang tham khảo không công khai địa chỉ/số điện thoại/email cụ thể —
  cần bổ sung thông tin liên hệ thật của MarketMMO khi có.
- **Tuân thủ**: cấm sử dụng tài khoản/sản phẩm giao dịch trên sàn cho mục đích lừa
  đảo, mạo danh hoặc vi phạm an ninh mạng — nên nêu rõ trong Điều khoản dịch vụ.

> Đây là thông tin **tham khảo mô hình**, không phải thông tin pháp lý chính thức
> của MarketMMO. Khi có thông tin công ty thật (tên pháp nhân, địa chỉ, số điện
> thoại, email hỗ trợ, mã số thuế...), cập nhật/thay thế mục này.

## Đối tượng người dùng & ngôn ngữ

- Người dùng cuối là người Việt Nam → giao diện, nội dung mặc định bằng **tiếng Việt**.
- Đơn vị tiền tệ mặc định: **VNĐ**. Cân nhắc tích hợp cổng thanh toán phổ biến ở VN
  (VNPay, Momo, chuyển khoản ngân hàng) bên cạnh thẻ quốc tế nếu cần.
- Đây là mặt hàng số (digital goods) → luồng giao hàng phải hỗ trợ **giao tự động**
  ngay sau khi thanh toán (ví dụ: hiển thị/email tài khoản, mã kích hoạt) thay vì
  quy trình vận chuyển vật lý.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript — `src/` + import
  alias `@/*`.
- **Styling**: Tailwind CSS v4 (config qua `@theme inline` trong
  `src/app/globals.css`, không có `tailwind.config.js` riêng).
- **Icon**: `lucide-react` (lưu ý: bộ icon **không có logo thương hiệu** như
  Facebook/TikTok — dùng SVG inline riêng cho các icon đó, xem `Footer.tsx`).
- **Animation**: `framer-motion` — xem component `Reveal` dùng chung cho hiệu
  ứng xuất hiện khi cuộn (`whileInView`).
- **Backend/DB**: Prisma ORM v5 + **PostgreSQL 16** chạy qua Docker
  (`docker-compose.yml` ở root — container `market-mmo-postgres-1`, cổng
  **5433** trên host, không phải 5432 mặc định vì máy dev này đã có một stack
  Docker khác (`du-an-mmo`, dự án riêng biệt tại `D:\Du-an-MMO`) chiếm cổng
  5432 — **không** dùng chung container đó). Bắt đầu DB: `docker compose up
-d`. Dữ liệu Postgres lưu trong Docker volume `marketmmo_pgdata`, không mất
  khi tắt container (chỉ mất nếu `docker compose down -v`).
  Các trường kiểu "enum" (`role`, `status`, `type`...) hiện là `String`
  (không dùng `enum` native của Prisma) — union type TypeScript tương ứng
  khai báo ở `src/lib/constants.ts`. Đây là lựa chọn có chủ đích giữ nguyên
  từ lúc còn dùng SQLite (không hỗ trợ enum); có thể chuyển sang `enum` thật
  trong `prisma/schema.prisma` bất kỳ lúc nào nếu muốn (Postgres hỗ trợ đầy
  đủ), không bắt buộc.
- **Auth**: Auth.js (`next-auth@5` beta) — Credentials (đăng nhập bằng
  **email hoặc username** + mật khẩu, hash bằng `bcryptjs` — field wire vẫn
  tên `email` để không phải đổi mọi nơi gọi `signIn`, nhưng `authorize()`
  tra cả `email` lẫn `username` qua `findFirst({ OR: [...] })`) + Google
  OAuth (chỉ bật khi có `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` trong `.env`).
  Đăng ký (`/api/auth/register`) vẫn bắt buộc nhập cả username lẫn email
  riêng biệt — chỉ luồng đăng nhập mới chấp nhận 1 trong 2. Session dùng
  chiến lược `jwt` (bắt buộc
  khi có Credentials provider). Cấu hình tại `src/auth.ts`. Đăng nhập/đăng ký
  đều có xác minh chống bot **Cloudflare Turnstile** (`src/components/
TurnstileWidget.tsx` + `src/lib/turnstile.ts`), theo cùng quy ước "tuỳ chọn
  theo env" như Google OAuth/VNPay: chỉ hiển thị widget và bắt buộc xác minh
  khi có `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` trong
  `.env`, thiếu key thì tự động bỏ qua bước xác minh (không chặn đăng nhập ở
  môi trường dev chưa đăng ký Cloudflare). Verify thất bại ném lỗi
  `CredentialsSignin` với `code: "turnstile"` để client phân biệt được với
  lỗi sai email/mật khẩu. **Quên mật khẩu**: link ở form đăng nhập →
  `/quen-mat-khau` → `/dat-lai-mat-khau?token=...`, gửi email qua **Resend**
  (`src/lib/email.ts`, env-gated `RESEND_API_KEY` — thiếu key thì log link
  reset ra console thay vì gửi thật, vẫn test được đầy đủ), xem model
  `PasswordResetToken` trong mục Backend. `AuthForms.tsx` (`/dang-nhap`)
  render **2 form tách biệt theo tab thật** (state `tab`, click đổi
  `"login"`/`"register"`, chỉ 1 form hiện tại 1 thời điểm) — trước đây 2 form
  hiện cùng lúc cạnh nhau trong lưới 2 cột, thanh "Đăng nhập | Đăng ký" phía
  trên chỉ là chữ tĩnh không bấm được; đã đổi theo yêu cầu người dùng. Hỗ trợ
  mở thẳng tab đăng ký qua query `?tab=register` (prop `initialTab`).
- **Thanh toán**: khung tích hợp **VNPay** đã viết đúng spec công khai
  (`src/lib/payment/vnpay.ts`, HMAC-SHA512) nhưng cần `VNPAY_TMN_CODE` +
  `VNPAY_HASH_SECRET` thật (đăng ký merchant với VNPay) mới hoạt động — xem
  mục "Backend" bên dưới. Khi chưa có key, hệ thống tự động chỉ cho phép nạp
  tiền thủ công (admin duyệt).

### Lệnh thường dùng

```bash
docker compose up -d  # khởi động PostgreSQL cho dự án (bắt buộc trước khi dev)
npm run dev         # chạy dev server tại http://localhost:3000
npm run build        # build production
npm run start         # chạy bản build production
npm run lint          # eslint
npm run db:push       # đồng bộ prisma/schema.prisma vào database (postgres)
npm run db:seed       # nạp lại dữ liệu mẫu (category/product/seller/admin/buyer demo)
npm run db:studio     # mở Prisma Studio để xem/sửa dữ liệu trực quan
npm run screenshot -- <url> <outPath> [width] [height] [fullPage]
                       # chụp screenshot bằng Playwright, dùng cho quy tắc
                       # bắt buộc "đối chiếu design" bên dưới
```

Lần đầu clone dự án: copy `.env.example` → `.env` (chỉnh `AUTH_SECRET` cho môi
trường thật), chạy `docker compose up -d` để khởi động Postgres, sau đó
`npm run db:push && npm run db:seed`.

**Project skill**: `.claude/skills/start-dev/SKILL.md` — quy trình chuẩn để
bật Postgres + dev server + xác nhận app chạy thật (screenshot) + tài khoản
demo + các gotcha đã gặp (EPERM khi generate Prisma lúc dev server đang chạy,
sai cổng DATABASE_URL...). Dùng skill này thay vì dò lại từ đầu mỗi phiên.

### Cấu trúc thư mục chính

```
docker-compose.yml  # container Postgres riêng cho dự án (cổng host 5433)
prisma/
  schema.prisma  # User, Account/Session/VerificationToken (Auth.js), Seller,
                 # Category, Product, Order, OrderItem, WalletTransaction, Review
  seed.ts        # nạp category/product từ src/data/*.ts vào DB kèm 4 seller,
                 # 1 admin, 1 buyer demo (chạy qua `npm run db:seed`)
src/
  auth.ts        # cấu hình Auth.js (Credentials + Google), export auth/signIn/signOut/handlers
  app/
    page.tsx                    # Trang chủ — fetch qua src/lib/queries.ts (Prisma)
    danh-muc/[slug]/page.tsx    # Trang danh mục — dynamic, fetch DB theo slug
    san-pham/[slug]/page.tsx    # Chi tiết sản phẩm — dynamic, fetch DB theo slug
    shop/[seller]/page.tsx      # Gian hàng người bán — dynamic, fetch DB theo slug
    dang-nhap/page.tsx          # Đăng nhập / Đăng ký thật (AuthForms — signIn/register API,
                                 # dạng tab thật — xem ghi chú AuthForms.tsx bên dưới)
    quen-mat-khau/page.tsx      # ForgotPasswordForm — nhập email, gửi link reset qua Resend
    dat-lai-mat-khau/page.tsx   # ResetPasswordForm (đọc ?token=) — đặt mật khẩu mới
    nap-tien/page.tsx           # Ví — DepositPanel (VNPay hoặc yêu cầu thủ công + lịch sử)
    gio-hang/page.tsx           # Giỏ hàng (client, CartContext) + nút thanh toán thật
    don-hang/page.tsx           # Lịch sử đơn hàng thật (yêu cầu đăng nhập, redirect nếu chưa)
    tro-thanh-nguoi-ban/page.tsx # SellerRegisterForm — tạo Seller record thật
    quan-ly-san-pham/page.tsx   # (SELLER/ADMIN) ProductVariantManager — seller tự thêm/xoá
                                 # biến thể (label/giá/kho riêng) cho SẢN PHẨM CỦA MÌNH; base
                                 # product vẫn chỉ tạo qua seed, trang này CHƯA tạo SP mới.
                                 # Vẫn giữ hoạt động song song với /trang-ban-hang/san-pham
                                 # (route mới render lại đúng component này) — không xoá.
    trang-ban-hang/layout.tsx   # (SELLER/ADMIN) "Quản Lý Bán Hàng" — dashboard người bán đầy đủ,
                                 # xem mục "Quản Lý Bán Hàng" trong "Luồng nghiệp vụ chính" để
                                 # biết chi tiết từng trang con và thiết kế an toàn luồng tiền.
                                 # layout.tsx: guard đăng nhập + seller (redirect nếu không đạt)
                                 # + render SellerSidebar bọc quanh mọi trang con bên dưới.
    trang-ban-hang/page.tsx               # Tổng quan — doanh thu theo khoảng ngày (searchParams)
    trang-ban-hang/san-pham/page.tsx      # SellerProductsPanel — AddProductForm ("Đăng sản
                                           # phẩm mới") + ProductVariantManager (dùng chung
                                           # với /quan-ly-san-pham) render cùng trang
    trang-ban-hang/don-san-pham/page.tsx  # đơn hàng thuộc category KHÔNG phải dịch vụ
    trang-ban-hang/don-dich-vu/page.tsx   # đơn hàng thuộc category dịch vụ (SERVICE_CATEGORY_SLUGS)
    trang-ban-hang/rut-tien/page.tsx      # SellerWithdrawPanel — yêu cầu rút tiền + lịch sử
    trang-ban-hang/quy-bao-hiem/page.tsx  # SellerInsurancePanel — nạp quỹ bảo hiểm + lịch sử
    trang-ban-hang/danh-gia/page.tsx      # danh sách đánh giá gian hàng (đọc, không sửa)
    trang-ban-hang/dat-truoc/page.tsx     # SellerPreOrderPanel — toggle preOrder + đơn đang chờ
    trang-ban-hang/ma-giam-gia/page.tsx   # SellerDiscountCodesPanel — tạo/bật/tắt/xoá mã giảm giá
    trang-ban-hang/khieu-nai/page.tsx     # SellerDisputesList — danh sách khiếu nại (đọc, admin xử lý)
    trang-ban-hang/telegram-bot/page.tsx  # SellerTelegramPanel — liên kết Chat ID (env-gated)
    trang-ban-hang/xac-thuc-cccd/page.tsx # SellerVerificationPanel — upload CCCD 2 mặt, xem trạng thái
    nguoi-ban/page.tsx          # Danh sách tất cả seller kèm rating trung bình (link ngay
                                 # sau "Đăng Ký Bán Hàng" trong nav)
    affiliate/page.tsx          # Affiliate/giới thiệu thật — mã + link mời, thống kê hoa
                                 # hồng (AffiliatePanel), yêu cầu đăng nhập
    admin/page.tsx              # Bảng quản trị (chỉ role ADMIN) — duyệt nạp tiền, giải ngân
                                 # escrow, giải quyết phiên đấu giá
    dau-gia/page.tsx            # Đấu giá "vị trí vàng" — banner, lịch đấu giá, 6 slot,
                                 # form đặt giá (AuctionBidForm), hướng dẫn
    dien-dan/page.tsx           # Diễn đàn thật — danh sách bài viết (ForumPost) + nút
                                 # "Đăng bài mới" (ForumNewPostPanel)
    dien-dan/[postId]/page.tsx  # Chi tiết bài viết — nội dung, nút thích (ForumLikeButton),
                                 # danh sách + form bình luận (ForumCommentForm)
    lay-2fa/page.tsx            # Công cụ lấy mã 2FA (TOTP tính client-side)
    tin-nhan/page.tsx           # Chat thật buyer-seller + bot "Hệ Thống" (ChatInbox), yêu
                                 # cầu đăng nhập, hỗ trợ ?with=<userId> để tự mở hội thoại
    cau-hoi-thuong-gap/, dieu-khoan-dich-vu/, dieu-khoan-ban-hang/,
    chinh-sach-bao-mat/, sitemap-trang-web/, tai-lieu-api/  # trang nội dung tĩnh
    api/
      auth/[...nextauth]/route.ts  # Auth.js route handler
      auth/register/route.ts       # đăng ký tài khoản (bcrypt hash) + xử lý mã mời affiliate
                                    # (refCode optional) trong cùng transaction
      auth/forgot-password/route.ts # tạo PasswordResetToken (SHA-256 hash) + gửi email Resend,
                                    # luôn trả message chung chung (không lộ email có tồn tại)
      auth/reset-password/route.ts # verify token + hạn + chưa dùng, đổi passwordHash
      checkout/route.ts            # giỏ hàng → Order/OrderItem, trừ ví, giảm kho, escrow
      wallet/deposit-request/route.ts  # tạo WalletTransaction PENDING (nạp thủ công)
      wallet/transactions/route.ts     # lịch sử giao dịch ví của user hiện tại
      payment/vnpay/create/route.ts    # tạo URL thanh toán VNPay (cần env key)
      payment/vnpay/return/route.ts    # xác thực chữ ký + cộng ví khi VNPay redirect về
      seller/register/route.ts         # tạo Seller record + nâng role user lên SELLER
      seller/products/route.ts         # (SELLER) GET — danh sách sản phẩm của chính seller
                                        # kèm variants (dùng lại getMySellerProducts()); POST —
                                        # đăng sản phẩm gốc mới, tạo với status "PENDING"
      admin/products/route.ts          # (ADMIN) GET — danh sách sản phẩm PENDING/REJECTED
      admin/products/[id]/route.ts     # (ADMIN) POST {action: "approve"|"reject", adminNote?}
                                        # — duyệt/từ chối 1 sản phẩm seller vừa đăng
      seller/products/[productId]/variants/route.ts
                                        # POST — seller thêm 1 biến thể (label/price/stock)
                                        # cho sản phẩm CỦA CHÍNH MÌNH (kiểm tra sellerId)
      seller/products/[productId]/variants/[variantId]/route.ts
                                        # PATCH/DELETE — sửa/xoá 1 biến thể, cùng kiểm tra
                                        # quyền sở hữu qua sellerId của product cha
      seller/products/[productId]/route.ts    # PATCH — seller bật/tắt Product.preOrder cho
                                               # sản phẩm CỦA CHÍNH MÌNH (kiểm tra sellerId)
      discount-codes/preview/route.ts  # POST — xem trước số tiền giảm (KHÔNG tăng usedCount,
                                        # KHÔNG đụng tiền) — checkout tự tính lại độc lập
      seller/discount-codes/route.ts   # GET/POST — (SELLER) danh sách/tạo mã giảm giá
      seller/discount-codes/[id]/route.ts     # PATCH (bật/tắt)/DELETE — cùng kiểm tra sellerId
      disputes/route.ts                # POST — buyer HOẶC seller mở khiếu nại trên 1 OrderItem
                                        # đang ESCROW (chuyển status → DISPUTED)
      admin/disputes/route.ts          # (ADMIN) danh sách khiếu nại
      admin/disputes/[id]/route.ts     # (ADMIN) "refund_buyer" (hoàn 100% buyer) hoặc
                                        # "release_seller" (giải ngân seller) — không có % tuỳ ý
      seller/telegram/route.ts         # GET trạng thái liên kết; POST {action: "link"|"confirm"|
                                        # "unlink"|"test"} — env-gated TELEGRAM_BOT_TOKEN
      seller/verification/route.ts     # GET trạng thái; POST (multipart) — upload ảnh CCCD 2 mặt
                                        # + họ tên/số CCCD, lưu ngoài /public
      seller/verification/image/[side]/route.ts  # GET ảnh CCCD của CHÍNH seller đang đăng nhập
                                                   # (route được bảo vệ, không public)
      admin/verifications/route.ts     # (ADMIN) danh sách yêu cầu xác thực CCCD
      admin/verifications/[id]/route.ts       # (ADMIN) duyệt (set Seller.verified=true)/từ chối
      admin/verifications/[id]/image/[side]/route.ts  # (ADMIN) xem ảnh CCCD của BẤT KỲ seller nào
      reviews/route.ts                 # POST — gửi đánh giá 1-5 sao cho seller (chỉ khi
                                        # đã mua hàng từ seller đó, 1 review/user/seller, upsert)
      admin/deposits/route.ts          # (ADMIN) danh sách yêu cầu nạp tiền
      admin/deposits/[id]/route.ts     # (ADMIN) duyệt/từ chối một yêu cầu
      admin/escrow/release/route.ts    # (ADMIN) giải ngân các OrderItem đến hạn ký quỹ
      seller/withdraw-request/route.ts # POST — seller tạo yêu cầu rút tiền (TRỪ VÍ NGAY,
                                        # xem "Quản Lý Bán Hàng"); GET — lịch sử rút tiền của
                                        # chính seller đó
      admin/withdrawals/route.ts       # (ADMIN) danh sách yêu cầu rút tiền
      admin/withdrawals/[id]/route.ts  # (ADMIN) duyệt (chỉ đổi trạng thái) / từ chối (hoàn
                                        # tiền) — mirror 1:1 admin/deposits/[id]/route.ts
      seller/insurance-deposit/route.ts # POST — nạp quỹ bảo hiểm (tự động duyệt ngay, chuyển
                                         # tiền nội bộ ví → insuranceBalance); GET — lịch sử
      auction/bids/route.ts            # POST — seller đặt giá đấu cho 1 vị trí vàng
      admin/auction/resolve/route.ts   # (ADMIN) đóng slot hết hạn, chọn người thắng, xoay
                                        # vòng slot mới
      forum/posts/route.ts             # POST — đăng bài viết diễn đàn mới (ForumPost)
      forum/posts/[postId]/comments/route.ts  # POST — gửi bình luận cho 1 bài viết
      forum/posts/[postId]/like/route.ts      # POST — toggle thích/bỏ thích 1 bài viết
                                                # (unique theo postId+userId)
      messages/conversations/route.ts         # GET danh sách hội thoại của user hiện tại;
                                               # POST {targetUserId} — get-or-create hội thoại
      messages/conversations/[id]/route.ts    # GET tin nhắn (đồng thời đánh dấu đã đọc)/
                                               # POST gửi tin (FormData: content + file tuỳ
                                               # chọn) — verify user là 1 trong 2 người tham
                                               # gia, 404 nếu không (chặn rò rỉ tin nhắn)
      messages/attachments/[messageId]/route.ts  # GET ảnh/file đính kèm 1 tin nhắn — verify
                                                  # người gọi thuộc đúng hội thoại chứa nó
      messages/unread-count/route.ts          # GET tổng số tin chưa đọc — Header poll mỗi 15s
    globals.css    # design tokens qua @theme inline (Tailwind v4)
  components/  # Header, NavMegaMenu (dropdown hover Sản phẩm/Dịch vụ/Nạp tiền),
               # Footer, LegalNotice, LegalPageLayout, ProductCard,
               # CategorySidebar, CategoryTabs, FeaturedCarousel, FeaturedProductsPanel,
               # SellerCarousel, SellerFeaturedPanel,
               # AuctionCountdown, AuctionBidForm, PromoBanner,
               # TagCloud, BuyBox, DepositPanel, AdminDashboard,
               # SellerRegisterForm, ReviewForm, AuthForms, ForgotPasswordForm,
               # ResetPasswordForm, AffiliatePanel,
               # ForumNewPostPanel, ForumLikeButton, ForumCommentForm,
               # Providers, TotpTool, RatingStars, Breadcrumb, Reveal,
               # SellerSidebar, SellerOverviewStats, SellerOrdersTable,
               # SellerWithdrawPanel, SellerInsurancePanel, SellerReviewsList,
               # SellerPreOrderPanel, SellerDiscountCodesPanel, SellerDisputesList,
               # OpenDisputeButton (nút mở khiếu nại, dùng ở /don-hang),
               # HeaderChatButton (icon chat + badge chưa đọc trên Header), ChatInbox,
               # SellerTelegramPanel, SellerVerificationPanel, ProductVariantManager,
               # AddProductForm (form "Đăng sản phẩm mới"), SellerProductsPanel (điều phối
               # AddProductForm + ProductVariantManager), ProductThumbnail (ảnh sản phẩm
               # thật hoặc fallback icon category, dùng chung mọi nơi), ProductInfoTabs
  context/
    CartContext.tsx # Giỏ hàng client: dòng giỏ hàng lưu "snapshot" sản phẩm
                     # (id/slug/tên/giá/seller/stock) tại thời điểm thêm — không
                     # cần lookup lại DB từ client. Lưu localStorage (key
                     # "marketmmo_cart"), dùng qua hook `useCart()`.
  data/        # nguồn seed + kiểu `Product`/`Category` dùng chung: categories.ts
               # (10 category), products.ts (~28 sản phẩm, import bởi
               # prisma/seed.ts — KHÔNG dùng trực tiếp trong trang nữa).
               # posts.ts (mock diễn đàn cũ) đã xoá — diễn đàn giờ là dữ liệu
               # thật qua model ForumPost, xem lib/forum.ts.
  lib/
    prisma.ts     # PrismaClient singleton (tránh tạo nhiều connection khi hot-reload)
    queries.ts    # hàm fetch Prisma, map về đúng shape `Product` type cũ để
                  # UI component (ProductCard, BuyBox...) không cần đổi
    forum.ts      # getForumPosts()/getRecentForumPosts()/getForumPostById() — query
                  # ForumPost kèm _count comments/likes + likedByMe theo session hiện tại
    constants.ts  # union type Role/OrderStatus/WalletTxType/WalletTxStatus +
                  # ESCROW_HOLD_DAYS (3 ngày) + REFERRAL_COMMISSION_VND
                  # (20.000đ) + label tiếng Việt
    authz.ts      # requireUser()/requireAdmin() dùng trong API route
    referral.ts   # generateReferralCode()/ensureReferralCode() — sinh mã
                  # affiliate 8 ký tự, retry khi trùng unique constraint
    slug.ts, format.ts, totp.ts
    email.ts      # sendPasswordResetEmail() qua Resend — env-gated
                  # RESEND_API_KEY, thiếu key thì log link ra console thay vì
                  # gửi thật (dùng cho luồng quên mật khẩu)
    payment/vnpay.ts  # tạo URL thanh toán + xác thực chữ ký trả về (HMAC-SHA512)
    payment/deposit.ts  # getBankInfo()/getUsdtInfo() — đọc env, trả null nếu
                        # thiếu cấu hình (bank/USDT nạp tiền thủ công)
scripts/
  screenshot.mjs # script Playwright dùng cho `npm run screenshot`
```

Trang danh mục/sản phẩm/shop/trang chủ đều gắn `export const dynamic =
"force-dynamic"` vì dữ liệu (tồn kho, đã bán, số dư ví...) thay đổi liên tục —
không dùng `generateStaticParams`/SSG cho các trang này nữa.

## Design System (dựa trên ảnh tham khảo shopmini.pro)

Phong cách: **hiện đại, chuyên nghiệp, độ tương phản cao**, đặc trưng của các site
marketplace bán tài khoản/dịch vụ số tại VN — mật độ thông tin cao, tín hiệu tin
cậy rõ ràng (đánh giá sao, số lượng còn hàng), CTA nổi bật.

### Main content container

Toàn bộ trang dùng chung 1 bề rộng container (`mx-auto max-w-7xl`, 14 chỗ
dùng trong Header/Footer/các trang) — canh giữa, giới hạn bề ngang nội dung
trên màn hình rộng. Giá trị **đã chỉnh +15%** so với mặc định Tailwind: thay
vì sửa `max-w-7xl` → `max-w-[...]` ở từng file, ghi đè biến theme
`--container-7xl: 92rem` (80rem gốc × 1.15) trong `@theme inline` của
`globals.css` — Tailwind v4 dùng namespace `--container-*` để định nghĩa quy
mô cho mọi utility `max-w-*`/`w-*` cùng scale, nên 1 dòng áp dụng đồng loạt
cho toàn site, không cần sửa từng component. Muốn đổi lại kích thước
container: chỉ sửa biến này, **không** thêm `max-w-[...]` rải rác.

### Bảng màu

- **Primary — Xanh chuối non** (`#8DC63F` nền chính / `#6FA82E` đậm dùng cho
  hover-border-brand-dark/text nhấn / `#D4EDA6` nhạt dùng cho nền overlay
  `bg-brand-light`): dùng cho banner, nút CTA, badge giá, icon danh mục nổi
  bật, viền sản phẩm. Đổi từ tông vàng/gold ban đầu (`#FFC700`) sang xanh lá
  chuối non theo yêu cầu — toàn bộ 3 biến `--color-brand`/`--color-brand-dark`/
  `--color-brand-light` khai báo tập trung trong `src/app/globals.css`, mọi
  chỗ dùng qua utility `bg-brand`/`text-brand`/`border-brand`(-dark/-light)
  tự động đổi màu theo, không cần sửa từng component.
- **Nền tối — Đen/Navy đậm** (`#111111` – `#1A1A2E`): header trên cùng và footer.
- **Nền nội dung**: trắng, xen kẽ dải xám nhạt cho các hàng sản phẩm (dễ đọc khi
  danh sách dài).
- Dùng xanh chuối non làm điểm nhấn có chủ đích (giá, nút mua, badge khuyến
  mãi, viền sản phẩm) — tránh phủ tràn lan gây rối mắt. Vài chỗ trước đây
  hardcode Tailwind `amber-*`/`yellow-*` thay vì dùng biến (viền hover thẻ sản
  phẩm, badge "Tài trợ", label "Chọn danh mục", tab sắp xếp đang chọn, icon
  đồng hồ "last active"...) đã đổi hết sang `border-brand-dark`/`text-brand-dark`/
  `bg-brand` — xem lịch sử để biết danh sách đầy đủ nếu cần đối chiếu.

### Bố cục Header (đã đo pixel-chính-xác từ shopmini.pro)

Header gồm 3 lớp xếp chồng. Kích thước lấy từ `getBoundingClientRect()` /
`getComputedStyle()` trực tiếp trên shopmini.pro (viewport 1280px) để khớp
tỉ lệ thật, không áng chừng:

1. **Ticker** nền tối: cao ~22px, `text-sm` (14px), ẩn trên mobile.
2. **Thanh chính nền brand** (xanh chuối non, trước đây vàng): cao **56px**
   (`h-14 sm:h-[56px]`). Logo = icon
   `logo-mark.png` (36-40px, bo góc, nền đen) + chữ **"MARKETMMO"** (không có
   ".PRO" — bỏ theo yêu cầu). Thanh tìm kiếm cao đúng **40px** (`h-10`). Nút
   **"Đăng nhập" nền đen chữ trắng** đứng trước, **"Đăng ký" nền trắng viền
   đen** đứng sau (khớp thứ tự màu của shopmini.pro — lưu ý dễ làm ngược).
   Cả 2 đều trỏ `/dang-nhap`, riêng "Đăng ký" thêm `?tab=register` để mở
   thẳng đúng tab đăng ký (xem `AuthForms.tsx` bên dưới). Trên mobile, ô tìm
   kiếm xuống hàng riêng full-width bên dưới logo/icon.
3. **Thanh nav nền trắng**: cao đúng **50px** (`h-[50px]`), chữ **16px
   (`text-base`) font-semibold** (không phải `text-sm` 14px như bản cũ). Thứ
   tự: Trang chủ, **Sản phẩm ⌄**, **Dịch vụ ⌄**, **Nạp tiền ⌄** (3 mục có
   dropdown hover — xem `NavMegaMenu` bên dưới), Đơn Hàng, Lấy 2FA, Kiếm
   tiền, Diễn đàn … rồi **badge trái động** và **"Danh Sách Seller"** bên phải,
   mỗi chữ bọc riêng trong **badge nền brand (`bg-brand`) chữ đen (`text-ink`),
   bo tròn `rounded-full`** — hai badge tách biệt, không dùng chung một khung
   (theo yêu cầu tường minh, đừng gộp lại). Cùng pattern với badge "HOT" ở
   panel Sản phẩm nổi bật. Trên mobile gộp vào menu hamburger (dạng danh sách
   phẳng), 2 badge này vẫn giữ style nền brand/chữ đen riêng, kích thước theo
   nội dung (`w-fit`) chứ không kéo full-width như các link khác trong menu.

   **Badge trái động theo vai trò** (`Header.tsx`, biến `isSeller`/
   `sellerBadgeHref`/`sellerBadgeLabel`): mặc định hiện **"Đăng Ký Bán Hàng"**
   trỏ `/tro-thanh-nguoi-ban` (chưa đăng nhập, hoặc đã đăng nhập nhưng vẫn là
   BUYER thường). Ngay khi `session.user.role` là `SELLER`/`ADMIN` (đã đăng
   ký bán hàng thành công), badge tự đổi thành **"Quản Lý Bán Hàng"** trỏ
   thẳng `/trang-ban-hang` — cùng 1 vị trí/style, không thêm badge mới, tránh
   hiện nút "Đăng Ký Bán Hàng" vô nghĩa với người đã là seller. Áp dụng đồng
   bộ cả desktop nav lẫn menu mobile (dùng chung 2 biến, không lặp logic).

### Dropdown hover (`NavMegaMenu`)

`src/components/NavMegaMenu.tsx` — mega-menu CSS thuần (`group` +
`group-hover`, không cần state/JS), tái tạo hành vi hover-dropdown của
shopmini.pro cho 3 mục **Sản phẩm / Dịch vụ / Nạp tiền**:

- **Sản phẩm**: lưới 2 cột, đủ 10 category thật từ `src/data/categories.ts`
  (icon emoji + tên), trỏ tới `/danh-muc/[slug]`.
- **Dịch vụ**: do MarketMMO chưa tách bảng "dịch vụ" khỏi "sản phẩm" trong
  schema, 4 mục trỏ vào các category liên quan (Boosting, ChatGPT, YouTube)
  — không bịa trang mới.
- **Nạp tiền**: "Nạp tiền ngay" + "Lịch sử giao dịch", cả hai đều trỏ tới
  `/nap-tien` vì trang ví đã gộp cả 2 phần trên cùng 1 trang
  (`DepositPanel`).
- Nội dung dropdown ở shopmini.pro dùng nhãn/số lượng riêng của họ (Email,
  Khác, Phần mềm, Tài Khoản...) — **không copy nguyên nhãn đó** vì không khớp
  category thật của MarketMMO; chỉ tái tạo đúng **kiểu tương tác** (hover mở
  mega-menu góc bo, shadow, chevron xoay 180°).

### Logo thương hiệu

- `public/logo-mark.png` — icon hexagon "MM" (bạc/xanh lá, nền đen; nửa phải
  trước đây vàng/gold, đã hue-shift sang xanh lá khớp `--color-brand` khi đổi
  tông màu thương hiệu — script tạm dùng `sharp` đọc HSL từng pixel, chỉ xoay
  hue vùng có hue vàng/cam ~15-65° sang 120° và giữ nguyên saturation/
  lightness để không mất hiệu ứng đổ bóng 3D gốc, đã xoá sau khi chạy xong)
  đã cắt riêng từ ảnh gốc, dùng cho **Header**, **Footer**, và favicon
  (`src/app/icon.png` — quy ước Next.js App Router, tự sinh route
  `/icon.png`, không cần khai báo `metadata.icons`).
- `public/logo-full.png` — ảnh logo gốc đầy đủ (icon + wordmark "MARKETMMO" +
  tagline "DIGITAL ASSETS MARKETPLACE"), cũng đã hue-shift đồng bộ, giữ lại
  làm tài sản thương hiệu cho các nhu cầu sau này (ảnh chia sẻ mạng xã hội,
  trang giới thiệu...), hiện
  chưa dùng trực tiếp trong UI.
- Khi thay logo mới: thay 2 file này (giữ nguyên tên) là đủ, không cần sửa
  code — Header/Footer/favicon đều tham chiếu qua đường dẫn cố định.

### Bố cục trang chủ (`/`)

Banner quảng cáo 2 khối (dark + xanh lá) → carousel "Sản phẩm nổi bật" (badge TÀI
TRỢ) → carousel "Các Seller Nổi Bật" → tabs danh mục (Tất cả/Sản phẩm/Dịch vụ +
chip từng category kèm số lượng) → thanh tiêu đề brand "DANH SÁCH SẢN PHẨM" →
grid sản phẩm → pagination → tag cloud "Tìm kiếm phổ biến" → banner tuân thủ
pháp luật → footer.

`PromoBanner.tsx` (`"use client"`) render 2 khối (trái/phải), **mỗi khối tự
động luân phiên giữa 2 ảnh** (component `BannerSlot`, `setInterval` 5s) —
không còn là 2 khối CSS gradient/text dựng tay, và không còn chỉ 1 ảnh
tĩnh/khối nữa. Khung hiển thị hiện **dẹt ngang** (`aspect-[872/334]` trái /
`aspect-[877/334]` phải — chiều cao đã chủ động thu còn 50% so với chiều cao
gốc 668px của ảnh nguồn theo yêu cầu, chiều ngang giữ nguyên).

**Chuyển ảnh kiểu trượt ngang (slide) + kéo chuột/vuốt tay thủ công** (thay
cho crossfade opacity ban đầu, theo yêu cầu người dùng): track `flex` chứa
toàn bộ ảnh, dịch chuyển bằng `transform: translateX(...)` — mỗi ảnh rộng
đúng `(100/count)%` của track, `transform 700ms ease` khi tự động chuyển
(index tăng → track trượt sang trái, ảnh mới trượt vào từ bên phải). Kéo
chuột/vuốt tay dùng **Pointer Events** (`onPointerDown/Move/Up/Leave/Cancel`,
1 API dùng chung cho cả mouse lẫn touch) — trong lúc kéo tắt `transition`
(theo sát ngón tay/con trỏ tức thời qua state `dragPx` cộng thẳng vào
`translateX`), nhả tay tính tỷ lệ khoảng đã kéo so với bề rộng khung
(`DRAG_THRESHOLD_RATIO = 0.15`): vượt 15% mới đổi ảnh (kéo trái → ảnh sau,
kéo phải → ảnh trước, có `modulo` nên ảnh cuối kéo tiếp sẽ vòng về ảnh đầu),
chưa đủ thì bật lại đúng ảnh cũ. Dùng `ref` (`pausedRef`, không phải state)
để tạm dừng auto-rotate trong lúc kéo mà không cần huỷ/tạo lại `setInterval`
— interval vẫn chạy nền, chỉ bỏ qua tick nào rơi đúng lúc đang kéo. 2 khối
trái/phải kéo **độc lập nhau** (mỗi `BannerSlot` tự quản lý state riêng).

4 ảnh (`public/banner-home-left-1.jpg`, `-left-2.jpg`, `-right-1.jpg`,
`-right-2.jpg`, JPEG chất lượng 90, ~75-110KB/ảnh) cắt ra từ 1 ảnh lưới 2×2
do AI tạo (người dùng cung cấp), dùng `sharp` `.extract()` theo toạ độ dò
pixel (đo khoảng trắng mảnh phân cách 4 ô trong ảnh gốc). Ảnh nguồn (~996-
1011px rộng) **không cùng tỉ lệ khung** với khung banner hiện tại (872-877 :
334) — ảnh hàng trên (`-1.jpg`, tỉ lệ ~2.25-2.29:1) hẹp hơn khung nên bị
`object-cover` crop trên-dưới; ảnh hàng dưới (`-2.jpg`, tỉ lệ ~3.10-3.15:1)
rộng hơn khung nên bị crop 2 bên trái-phải. Vì nội dung quan trọng (logo/
tiêu đề) luôn nằm ở góc trên-trái mọi ảnh, đã set `object-top` cho 2 ảnh
hàng trên và `object-left` cho 2 ảnh hàng dưới (thay vì crop-giữa mặc định)
để tránh cắt mất chữ đầu dòng — bug thật đã gặp và sửa: ban đầu dùng crop-
giữa mặc định làm mất chữ "F" của "FLASH SALE"/"B" của "Bảo vệ tuyệt đối",
sau khi đổi `object-left` mới hiện đầy đủ (đổi lại nút CTA bên phải bị crop
một phần — đánh đổi chấp nhận được vì tiêu đề quan trọng hơn nút bấm).

Khi thay banner mới: cắt ảnh mới đè lên đúng 4 file này (giữ nguyên tên) là
đủ. Nếu ảnh mới có tỉ lệ khung khác, cân nhắc lại `object-top`/`object-left`
cho từng ảnh trong `PromoBanner.tsx` thay vì giữ nguyên mù quáng.

### "Sản phẩm nổi bật" (`FeaturedProductsPanel` + `FeaturedCarousel`)

Kích thước gốc đo trực tiếp trên shopmini.pro (không áng chừng): khung bọc
`border-radius: 10px`, `padding: 20px` (khớp `.search-container` của họ);
ảnh sản phẩm trong mỗi thẻ ban đầu 176×176px khớp bản gốc, sau đó **phóng to
thêm +25% theo yêu cầu** (176→220px, thẻ 192→240px) — toàn bộ chi tiết trong
thẻ (badge, avatar seller, chữ tên/giá/đã bán, icon giỏ hàng, khoảng cách
giữa các thẻ) scale đồng bộ theo cùng tỉ lệ 1.25× ở bước này. Sau đó chỉnh
tiếp lần 2 theo yêu cầu: **thu hẹp bề ngang 15%, tăng chiều cao 15%** — chỉ
áp dụng lên khung ảnh + bề rộng thẻ (220→187px / 240→204px ngang, ảnh
220→253px cao), **không** thu nhỏ lại chữ/badge/icon ở bước này (khác bước
+25% trước đó vốn scale toàn bộ). Thẻ hiện có dáng **thon dọc** (portrait)
thay vì gần vuông. Kích thước hiện tại không còn khớp 1:1 với shopmini.pro —
là lựa chọn có chủ đích của bạn qua nhiều bước chỉnh liên tiếp, không phải
sai lệch. Xem lịch sử giá trị chính xác trong `FeaturedCarousel.tsx`.
Carousel **tự động trôi liên tục từ trái sang phải, lặp vô
hạn** (`.animate-marquee-right` trong `globals.css`) — không còn nút mũi tên
cuộn tay; track chứa nội dung nhân đôi (`[...items, ...items]`) để loop liền
mạch không giật, dừng lại khi hover (`animation-play-state: paused`) để
người dùng có thể bấm vào thẻ, và tự tắt animation khi
`prefers-reduced-motion`. Tốc độ tỉ lệ theo số lượng sản phẩm
(`max(18s, items.length * 4s)`) để nhịp trôi luôn đều.

### "Các Seller Nổi Bật" (`SellerFeaturedPanel` + `SellerCarousel`)

Section riêng ngay dưới "Sản phẩm nổi bật" trên trang chủ, lấy dữ liệu qua
`getAllSellersWithStats()`. Theo yêu cầu tường minh: **khung bọc và kích
thước từng thẻ bên trong bằng y hệt** `FeaturedProductsPanel`/`FeaturedCard`
(cùng `rounded-[10px] border p-4/p-5`, thẻ `w-[187px] sm:w-[204px]`, khung
ảnh `h-[253px]`), **tiêu đề cùng cỡ chữ/màu** (`text-[14.4px] font-black
text-ink` trong badge nền brand `bg-brand` bo tròn, giống hệt tiêu đề "Sản
Phẩm Nổi Bật" — chỉ đổi icon từ ảnh lửa sang icon `Store` màu đỏ, vì đây là
yêu cầu áp dụng cho phần chữ/badge, không bắt buộc icon). Mỗi thẻ hiển thị
chữ cái đầu tên shop (thay cho emoji category), badge "ĐÃ XÁC THỰC"/"SELLER",
số level, rating trung bình (sao đỏ) và số sản phẩm — cùng hệ thống cỡ chữ
15px/13px với `FeaturedCard`.

Carousel trôi **ngược chiều** — phải sang trái
(`.animate-marquee-left` trong `globals.css`, keyframe ngược với
`.animate-marquee-right`) — **cùng tốc độ px/giây** với "Sản phẩm nổi bật".
Lưu ý quan trọng: `SellerCarousel` **không** dùng sàn tối thiểu `max(18s,
...)` như `FeaturedCarousel`, chỉ dùng thuần `items.length * 4` — vì danh
sách seller thường ngắn hơn sản phẩm nổi bật (ví dụ 4 so với 8), nếu áp cùng
sàn 18s thì 2 carousel sẽ lệch tốc độ (đã đo bằng Playwright: lệch ~55 vs
~47px/s trước khi bỏ sàn, ~55 vs ~55px/s sau khi bỏ). Công thức `n * 4` giữ
tốc độ px/giây không đổi bất kể số lượng phần tử vì bề rộng track và duration
cùng tỉ lệ thuận với `n` — chỉ `FeaturedCarousel` cần sàn 18s vì danh sách
sản phẩm nổi bật đủ dài để hiếm khi chạm sàn.

Kỹ thuật marquee nhân đôi track (`[...items, ...items]`, chạy 0% → -50%) chỉ
liền mạch khi **một bản sao** đã đủ rộng để lấp đầy khung nhìn — nếu danh
sách quá ngắn (bug thật đã gặp: chỉ 4 seller ~876px trong khi khung panel
~1174-1400px), phần rìa phải của bản sao thứ 2 bị hở ra khoảng trắng khi
track dịch gần tới -50%. Khắc phục bằng cách lặp lại `items` thành 1 "block"
đủ rộng (`Math.ceil(1600 / (items.length * 219))` lần, mốc 1600px ứng với
`--container-7xl` + biên an toàn) rồi mới nhân đôi **block** đó để cuộn vô
hạn — xem `SellerCarousel.tsx`. Vì bề rộng block và duration
(`block.length * 4`) cùng tỉ lệ thuận theo số lần lặp, tốc độ px/giây vẫn
khớp với "Sản phẩm nổi bật" sau khi lặp (đã đo lại: bản sao rộng 1744px >
khung nhìn 1174px, không còn khoảng trắng). Nếu sau này thêm carousel dạng
marquee khác với danh sách có thể ngắn, áp dụng lại kỹ thuật lặp-thành-block
này thay vì nhân đôi trực tiếp danh sách gốc.

### Bố cục trang danh mục (`/danh-muc/[slug]`) — khớp ảnh tham khảo

Breadcrumb → layout 2 cột: **sidebar trái** (Bộ lọc theo danh mục, tình trạng
kho, widget "Bài viết tham khảo") + **nội dung phải** (tiêu đề danh mục, thanh
tiêu đề brand + bộ lọc sắp xếp, grid sản phẩm, pagination, đoạn mô tả danh mục).

### Khối "Mô tả / Tích hợp API / Đánh giá" (trang chi tiết sản phẩm)

`ProductInfoTabs.tsx` (`"use client"`, tách riêng khỏi `san-pham/[slug]/
page.tsx` vì cần state — trang cha vẫn là Server Component) — **tab bấm-
chuyển-nội-dung thật** (state `tab`, chỉ 1 nội dung hiện tại 1 thời điểm,
đã thử qua bản "hiện cả 3 cùng lúc chia 3 cột" trước đó nhưng người dùng yêu
cầu đổi lại thành tab). 3 nút tab chia đều `grid-cols-3`, tab đang chọn tô
`bg-ink text-white`, còn lại `bg-brand text-ink`, mỗi nội dung dùng dữ liệu
thật — không dùng dữ liệu giả:
- **MÔ TẢ SẢN PHẨM**: `product.description` (prop `description`).
- **TÍCH HỢP API**: đoạn giới thiệu ngắn + link tới trang `/tai-lieu-api` có
  sẵn của site (không tạo nội dung API mới, chỉ trỏ tới trang thật).
- **ĐÁNH GIÁ (REVIEWS)**: `RatingStars` + `product.rating`/`reviewCount`
  (số tĩnh từ seed, xem ghi chú ở mục "Domain" cuối file, prop `rating`/
  `reviewCount`) + link `sellerShopHref` (`/shop/[seller]`) xem đánh giá đầy
  đủ của gian hàng, **và bên dưới là danh sách bình luận thật + form gửi
  đánh giá** — tái dùng nguyên `ReviewForm.tsx`/`GET getSellerReviews()`/
  `POST /api/reviews` đã có sẵn từ trang shop (`/shop/[seller]`), KHÔNG xây
  hệ thống review theo từng sản phẩm riêng. Nghĩa là bình luận hiện ở đây là
  đánh giá **theo cả gian hàng** (mọi sản phẩm của seller đó dùng chung 1
  danh sách bình luận), không phải riêng cho sản phẩm đang xem — cùng giới
  hạn nghiệp vụ đã ghi ở mục "Domain" (`Product.rating`/`reviewCount` tĩnh
  và hệ thống Review thật vẫn tách theo Seller). `Product.sellerId` (field
  mới thêm vào type `Product` + `mapProduct()`, chỉ có khi fetch qua
  `getProductBySlugDb`) dùng để gọi `getSellerReviews(sellerId)` và truyền
  `sellerId` cho `<ReviewForm>` biết gửi đánh giá vào đúng seller nào. Điều
  kiện gửi được bình luận giữ nguyên như trang shop: phải đăng nhập **và**
  đã từng mua hàng từ seller đó (không cứ phải mua đúng sản phẩm này).

### Thẻ sản phẩm (`ProductCard`)

Dạng thẻ ngang trong grid 2-3 cột (không phải hàng full-width): ảnh/icon vuông
bên trái kèm badge danh mục + badge HOT, bên phải là tên (2 dòng), tên người
bán + badge "Đã xác thực", mô tả ngắn 1 dòng, kho/đã bán, lượt xem, giá (đỏ,
có thể là khoảng giá "9.000đ - 12.000đ").

### Footer

Banner tuân thủ pháp luật (nền brand nhạt, `bg-brand-light`) phía trên + footer nền tối 3 cột:
(1) thương hiệu + mô tả + social, (2) CTA "Đăng ký bán hàng", (3) danh sách
link hỗ trợ khách hàng. Widget liên hệ nổi cố định góc dưới phải
(`fixed bottom-5 right-5`, `Footer.tsx` — phải là `"use client"` vì nút lên
đầu trang cần `onClick`/`window.scrollTo`), chỉ gồm đúng **4 icon tròn ảnh
thật** (không còn nút "Hỗ trợ" dạng pill chữ, cũng không còn icon tự vẽ bằng
lucide/CSS gradient của bước trước — đã thay bằng ảnh do người dùng cung
cấp), kích thước `h-[57px] w-[57px]` (44px gốc +30%), khoảng cách giữa các
icon `gap-6` (24px, gấp đôi `gap-3` gốc), xếp dọc từ trên xuống: **Zalo**,
**Messenger**, **Gọi điện**, đường kẻ phân cách mảnh, rồi **lên đầu trang**
(cuộn mượt `behavior: "smooth"`).

File ảnh: `public/support-zalo.png`, `public/support-messenger.png`,
`public/support-phone.png`, `public/support-arrow-up.png` — cắt ra từ 1 ảnh
chụp gốc người dùng gửi (4 icon xếp dọc, mỗi icon hình tròn 64×64px, cách
nhau đều) bằng `sharp` (`.extract()` theo toạ độ dò được qua quét pixel hàng/
cột), sau đó khử nền xám nhạt `(246,246,246)` của ảnh chụp gốc thành trong
suốt (alpha) để icon nổi đúng trên mọi nền trang — xem quy trình tương tự đã
dùng cho `public/fire-icon.png`. Khi cần thay icon mới: đè trực tiếp 4 file
này (giữ nguyên tên), không cần sửa `Footer.tsx`.

Cả 3 link Zalo/Messenger/Gọi điện hiện dùng `href="#"` placeholder — giống
quy ước social Facebook/YouTube/TikTok ở trên, cần thay bằng link Zalo OA /
Messenger / số điện thoại thật khi có thông tin liên hệ chính thức.

### Nguyên tắc UI

- Font đậm, dễ đọc; tiêu đề thương hiệu có thể viết hoa.
- Badge/nhãn rõ ràng cho: giảm giá %, HOT, Đã xác thực, TÀI TRỢ.
- `lucide-react` không có icon logo thương hiệu (Facebook/YouTube/TikTok) —
  dùng SVG inline riêng, xem `Footer.tsx`.
- Responsive: grid sản phẩm 3 cột (desktop) → 2 cột (tablet) → 1 cột (mobile);
  sidebar danh mục chuyển xuống trên cùng ở mobile.

## Backend (đã hiện thực thật)

### Lưu trữ file (`src/lib/uploads.ts`)

Dùng chung cho ảnh CCCD (`SellerVerification`) và ảnh/file đính kèm chat
(`Message.attachmentPath`) — **2 chế độ lưu trữ song song**, tự chọn theo
env, cùng quy ước env-var-gated như VNPay/Telegram/Resend trong dự án:

- **Có `BLOB_READ_WRITE_TOKEN`** (bắt buộc khi deploy lên Vercel): lưu qua
  **Vercel Blob** (`@vercel/blob`, `access: "public"` + `addRandomSuffix:
true` — URL có suffix ngẫu nhiên nên không đoán được, không public theo
  nghĩa "ai cũng thấy trong danh sách", chỉ ai có đúng URL mới xem được).
  Giá trị lưu vào DB (`frontImagePath`/`attachmentPath`...) là **URL Blob đầy
  đủ**. Bắt buộc dùng Blob khi deploy Vercel vì filesystem trong môi trường
  serverless **không lưu trữ lâu dài** — mỗi request/instance có thể chạy
  trên máy chủ khác, ghi vào ổ đĩa cục bộ dễ mất ngay sau đó hoặc sau lần
  deploy tiếp theo.
- **Thiếu token** (dev local mặc định): rơi về ghi ổ đĩa cục bộ, thư mục
  `/uploads` ở root (NGOÀI `/public`, không commit — xem `.gitignore`). Giá
  trị lưu vào DB là đường dẫn tương đối.

Dù lưu theo chế độ nào, **file không public trực tiếp** — API vẫn luôn tự
verify quyền xem (`requireSeller`/`requireAdmin`/kiểm tra user thuộc đúng
hội thoại) rồi mới đọc nội dung qua `readUploadedFile()` (tự nhận diện URL
Blob hay đường dẫn ổ đĩa qua tiền tố `http`) và trả về, trình duyệt/client
không bao giờ nhận được URL Blob trực tiếp để tự ý chia sẻ ra ngoài. Khi thay
đổi nguồn ảnh mới hoặc thêm loại file mới: chỉ cần sửa `src/lib/uploads.ts`,
không cần đụng vào từng route đọc file.

**Lưu ý kiểu TypeScript**: cài `@vercel/blob` (qua dependency `undici`) làm
`Buffer`/`Uint8Array` không còn được coi tương thích với `BodyInit` khi
truyền thẳng vào `new NextResponse(buffer, ...)` (xung đột global type giữa
`@types/node` và `undici-types` — lỗi biết đến trong cộng đồng Next.js, không
phải bug thật lúc runtime). Khắc phục bằng ép kiểu tường minh `buffer as
BodyInit` tại 3 route đọc file (`api/seller/verification/image/[side]`,
`api/admin/verifications/[id]/image/[side]`, `api/messages/attachments/
[messageId]`) — nếu thêm route đọc file mới, áp dụng cùng cách ép kiểu này.

### Mô hình dữ liệu (`prisma/schema.prisma`)

- **User**: email/username/passwordHash (bcrypt), `role` (BUYER/SELLER/ADMIN),
  `walletBalance` (Int, đơn vị VNĐ). Kèm `Account`/`Session`/
  `VerificationToken` chuẩn Auth.js cho OAuth (Google). `referralCode`
  (String, nullable + unique) là mã affiliate của chính user đó;
  `referredById`/`referredBy`/`referrals` (self-relation "Referrals") liên
  kết người đã mời/được mời. `referralCode` **nullable** dù là tính năng
  chính — vì dự án dùng `prisma db push` (không có migration), tài khoản có
  sẵn trước khi thêm tính năng chưa thể backfill mã qua migration; thay vào
  đó sinh "lười" (lazy) qua `ensureReferralCode()` (`src/lib/referral.ts`)
  ngay khi user đó vào trang `/affiliate` lần đầu — user đăng ký mới thì có
  mã ngay lúc tạo tài khoản. `referralRewarded` (Boolean) đặt trên **người
  được mời** (không phải người mời) — đánh dấu người giới thiệu của họ đã
  nhận hoa hồng cho riêng lượt mời này chưa, xem mục 9 "Luồng nghiệp vụ
  chính" để biết điều kiện kích hoạt. `lastActiveAt` (DateTime, nullable) —
  cập nhật trong callback `jwt()` (`src/auth.ts`): ghi ngay khi có phiên
  đăng nhập mới (`user` param có giá trị, áp dụng cho cả Credentials lẫn
  Google), và ghi throttle tối đa 1 lần/2 phút ở nhánh refresh token trên các
  request tiếp theo — tránh ghi DB mỗi request. Dùng để hiển thị "Online X
  trước"/"Đang online" ở trang chi tiết sản phẩm qua
  `formatLastActive()` (`src/lib/format.ts`).
- **PasswordResetToken**: 1-nhiều với `User`, phục vụ luồng quên mật khẩu.
  `tokenHash` (String, unique) lưu **SHA-256 hash** của token gốc — token gốc
  (32 byte ngẫu nhiên, đủ entropy nên không cần bcrypt) chỉ nằm trong link
  gửi qua email, không lưu trong DB, để rò rỉ DB không thể dùng trực tiếp
  reset mật khẩu người khác. `expiresAt` mặc định +60 phút
  (`PASSWORD_RESET_TOKEN_EXPIRY_MINUTES`, `src/lib/constants.ts`), `usedAt`
  đánh dấu đã dùng (chặn tái sử dụng). Tạo token mới tự xoá mọi token cũ
  chưa dùng của cùng user — chỉ 1 link hiệu lực tại 1 thời điểm.
- **Seller**: 1-1 với User đã nâng role SELLER, có `slug` (dùng cho
  `/shop/[seller]`), `level`, `verified`. `insuranceBalance` (Int, mặc định 0)
  — số dư quỹ bảo hiểm hiển thị như tín hiệu tin cậy ở trang chi tiết sản
  phẩm (giống shopmini.pro). Đã có **luồng nạp quỹ bảo hiểm thật** qua
  `/trang-ban-hang/quy-bao-hiem` (xem mục "Quản Lý Bán Hàng" trong "Luồng
  nghiệp vụ chính") — khác shopmini.pro, MarketMMO **không chặn cứng** tính
  năng bán hàng khi seller chưa nạp đủ mức gợi ý (`INSURANCE_FUND_TARGET`,
  `src/lib/constants.ts`, hiện 300.000đ), chỉ mang tính khuyến khích/tín
  nhiệm — đây là quyết định phạm vi có chủ đích, xem lý do trong lịch sử.
  `telegramChatId`/`telegramLinkCode` phục vụ liên kết Telegram Bot
  (`/trang-ban-hang/telegram-bot`, env-gated `TELEGRAM_BOT_TOKEN`) — xem mục
  "Luồng nghiệp vụ chính".
- **Category** / **Product**: Product thuộc 1 Category + 1 Seller;
  `description`/`attributes` lưu dạng JSON string (parse ở `queries.ts`).
  `Product.price`/`stock`/`sold` là giá trị **mặc định** — chỉ thật sự dùng
  khi sản phẩm **chưa có** `ProductVariant` nào (tương thích ngược với toàn
  bộ sản phẩm seed cũ). `preOrder` (Boolean, mặc định false) — seller đánh
  dấu "sắp có hàng" (`/trang-ban-hang/dat-truoc`), `POST /api/checkout` bỏ
  qua kiểm tra tồn kho cho sản phẩm này, `stock` có thể xuống âm.
  `imageUrl` (String, nullable) — ảnh thật do seller upload lúc đăng sản
  phẩm (xem mục "Đăng sản phẩm mới"), null thì UI fallback về icon category
  như trước (`ProductThumbnail.tsx`). `status` (`"PENDING"` | `"APPROVED"` |
  `"REJECTED"`, mặc định **`"APPROVED"`** — cố tình khác `SellerVerification`/
  `Dispute` (mặc định `"PENDING"`) vì migration thêm field này phải không
  làm ẩn mất toàn bộ sản phẩm seed cũ đã có sẵn từ trước; API tạo sản phẩm
  mới set `"PENDING"` tường minh, không dựa vào default) + `adminNote`
  (String, nullable — lý do admin từ chối, nếu có). Mọi query công khai
  (`getAllProducts`, `getFeaturedProducts`, `getProductsByCategory`,
  `searchProducts`, `getProductBySlugDb`, `getRelatedProductsDb`) đều lọc
  `status: "APPROVED"` — sản phẩm đang chờ duyệt/bị từ chối không hiện ở bất
  kỳ đâu trên site công khai, kể cả gõ đúng URL slug (404). Riêng
  `getMySellerProducts()` (trang quản lý sản phẩm của seller) **không lọc
  status** — seller luôn thấy đủ sản phẩm của mình ở mọi trạng thái kèm badge
  màu tương ứng (`PRODUCT_STATUS_LABEL` trong `src/lib/constants.ts`).
- **ProductVariant**: biến thể/gói do seller tự thêm cho sản phẩm CỦA MÌNH
  (vd Gmail: "Domain .US - Thuê 24h - Tên Việt" vs "Domain .Com - Thuê 24h"),
  mỗi variant có `label`/`price`/`stock`/`sold` riêng, `sortOrder` tăng dần
  theo thứ tự thêm. Khi `Product.variants.length > 0`, trang chi tiết sản
  phẩm (`BuyBox.tsx`) **bắt buộc chọn 1 variant** trước khi mua — giá/kho
  hiệu lực lấy từ variant đã chọn, ô mô tả ngắn (`shortDescription`) bị ẩn đi
  nhường chỗ cho lưới chọn variant. Quản lý qua `/quan-ly-san-pham` (seller
  tự thêm/xoá, **chưa có** sửa hàng loạt — trang này chỉ thêm variant cho
  sản phẩm đã tồn tại; tạo sản phẩm GỐC mới xem mục "Đăng sản phẩm mới").
- **Order** / **OrderItem**: 1 Order có nhiều OrderItem (đa người bán trong
  cùng 1 đơn — đúng bản chất multi-vendor). Mỗi OrderItem có `status` và
  `escrowReleaseAt` **riêng** vì mỗi item có thể thuộc seller khác nhau với
  thời điểm giải ngân khác nhau. `variantId`/`variantLabel` snapshot variant
  đã mua (nếu có) — `variantId` set `onDelete: SetNull` (không cascade) để
  seller xoá variant sau này không làm mất lịch sử đơn hàng, `variantLabel`
  vẫn hiển thị đúng tên variant tại thời điểm mua dù variant gốc đã bị xoá.
  `Order.discountCode`/`discountAmount` ghi lại mã giảm giá ĐÃ ÁP DỤNG cho
  đơn (nếu có) — chỉ mang tính hiển thị/audit, không dùng để tính lại tiền.
  `OrderItem.dispute` (1-1 optional) liên kết tới `Dispute` nếu đang bị
  khiếu nại (status chuyển `DISPUTED`, loại khỏi vòng giải ngân tự động).
- **DiscountCode**: mã giảm giá do seller tự tạo (`/trang-ban-hang/ma-giam-gia`),
  áp dụng cho **toàn bộ sản phẩm của chính seller đó** — không giảm chéo
  sang sản phẩm seller khác trong cùng giỏ hàng. `type` (PERCENT/FIXED),
  `maxUses` nullable (null = không giới hạn), `usedCount` tăng NGAY TRONG
  `$transaction` của `POST /api/checkout` (tránh race condition 2 checkout
  cùng dùng 1 mã `maxUses=1` cùng lúc). Logic tính/chia số tiền giảm nằm ở
  `src/lib/discount.ts`, xem mục "Luồng nghiệp vụ chính" để biết chi tiết
  bug đã bắt được và sửa (làm tròn số tiền giảm theo dòng hàng).
- **Dispute**: khiếu nại 1-1 với `OrderItem` (`@@unique` qua `orderItemId`),
  `openedById` là buyer HOẶC seller của đơn đó. `status`: OPEN →
  RESOLVED_REFUND (admin hoàn 100% tiền buyer) hoặc RESOLVED_RELEASE (admin
  giải ngân seller) — không có hoàn tiền một phần.
- **SellerVerification**: xác thực CCCD 1-1 với `Seller`, `frontImagePath`/
  `backImagePath` lưu giá trị trả về từ `src/lib/uploads.ts` (xem "Lưu trữ
  file" bên dưới — URL Vercel Blob hoặc đường dẫn tương đối trong `/uploads`
  tuỳ môi trường), chỉ đọc qua route được bảo vệ. Duyệt (`status:
  "APPROVED"`) đồng thời set `Seller.verified = true` — tích hợp thật vào
  badge "Đã xác thực" có sẵn, không phải cờ riêng.
- **WalletTransaction**: ghi nhận mọi biến động ví — `type` (DEPOSIT/
  PURCHASE/PAYOUT/REFUND/REFERRAL_BONUS/WITHDRAW/INSURANCE_DEPOSIT),
  `status` (PENDING/CONFIRMED/REJECTED). Đây là **sổ cái duy nhất** cho ví;
  `User.walletBalance` là số dư cache, luôn được cập nhật đồng thời trong
  cùng transaction Prisma với mỗi thay đổi.
- **Conversation / Message**: chat (`/tin-nhan`) giữa 2 `User` bất kỳ —
  `userAId`/`userBId` LUÔN chuẩn hoá (id nhỏ hơn xếp vào `userAId`) khi
  tạo/tìm hội thoại (`getOrCreateConversation()`,
  `src/lib/system-bot.ts`), `@@unique([userAId, userBId])` đảm bảo 1 cặp
  user chỉ có đúng 1 `Conversation`. Không dùng khái niệm buyer/seller cứng
  vì hội thoại với bot "Hệ Thống" (xem mục 12 "Luồng nghiệp vụ chính") không
  khớp khung đó — bot chỉ là 1 `User` bình thường được lazy-init, không có
  role riêng. `Message.attachmentPath`/`attachmentName`/`attachmentType`
  (nullable) — ảnh/file đính kèm tuỳ chọn, lưu ngoài `/public` giống ảnh
  CCCD (xem `saveChatAttachment()`, `src/lib/uploads.ts`).
- **Review**: đánh giá **1-5 sao + bình luận** của người mua dành cho **Seller**
  (không phải từng Product). `@@unique([sellerId, userId])` — mỗi người chỉ
  đánh giá 1 lần/gian hàng (gửi lại sẽ ghi đè đánh giá cũ, không tạo bản
  ghi trùng). Rating trung bình/tổng số đánh giá tính động (aggregate) ở
  `queries.ts`, không lưu cache trên `Seller`.
- **AuctionSlot / AuctionBid**: hệ thống đấu giá "vị trí vàng" — seller trả
  giá để sản phẩm của mình hiện trong carousel "Sản phẩm nổi bật" ở trang
  chủ trong một khoảng thời gian (mô phỏng đúng cơ chế của shopmini.pro, đối
  chiếu trực tiếp từ trang `/dau-gia` của họ, không phải suy đoán). 6 vị trí
  cố định: `position` 1-4 = `period` "WEEKLY" (thắng thì hiện 1 tuần),
  `position` 5-6 = "DAILY" (thắng thì hiện 1 ngày). `AuctionBid` nhiều-1 với
  `AuctionSlot`; giá cao nhất khi slot hết hạn (`endAt <= now`) thắng.
  `Product.featuredUntil` (DateTime, nullable) được set khi thắng — đây là
  cờ **khác** với `Product.hot` (sản phẩm được admin gắn cứng làm "TÀI TRỢ"
  qua seed, không qua đấu giá). `getFeaturedProducts()` gộp cả hai (`hot=true
OR featuredUntil > now`), UI phân biệt bằng badge khác nhau (xem
  `FeaturedCarousel.tsx`).
- **ForumPost / ForumComment / ForumLike**: diễn đàn cộng đồng thật (trước đây
  là mock tĩnh `src/data/posts.ts`, đã xoá file này). Bất kỳ user đăng nhập
  nào cũng đăng bài (`category` là 1 trong `FORUM_CATEGORIES`,
  `src/lib/constants.ts`), bình luận (đóng vai trò "chat" theo từng bài viết
  — thread bình luận công khai dưới mỗi bài, không phải chat real-time riêng
  tư), và thả tim 1 bài viết. `ForumLike` có `@@unique([postId, userId])` —
  mỗi user chỉ thích 1 lần/bài, bấm lại để bỏ thích (toggle qua
  `POST /api/forum/posts/[postId]/like`). Không có trường `views`/lượt xem
  (giống `Product.views`, cũng không được tăng ở đâu trong code — chỉ là số
  tĩnh) để tránh thêm tính năng không ai dùng tới.

### Luồng nghiệp vụ chính

1. **Đăng ký/Đăng nhập**: `POST /api/auth/register` tạo User (role BUYER mặc
   định) → tự động `signIn("credentials", ...)`. Đăng nhập qua Auth.js
   Credentials provider, so khớp bcrypt.
2. **Mua hàng** (`POST /api/checkout`, dùng chung cho "Mua ngay" ở
   `BuyBox` và thanh toán giỏ hàng ở `/gio-hang`): trong 1 Prisma
   `$transaction` — kiểm tra tồn kho từng sản phẩm, tính tổng tiền, kiểm tra
   `walletBalance` đủ hay không, tạo `Order` + `OrderItem` (status `ESCROW`,
   `escrowReleaseAt = now + ESCROW_HOLD_DAYS` ngày — hằng số ở
   `lib/constants.ts`, mặc định 3), trừ tồn kho + cộng đã bán, trừ ví buyer,
   ghi `WalletTransaction` loại PURCHASE. Mỗi item gửi lên có thể kèm
   `variantId` (`CartLine`/`BuyBox` đều hỗ trợ) — nếu sản phẩm **có**
   variant, **bắt buộc** phải gửi đúng `variantId` (nếu thiếu, throw lỗi yêu
   cầu chọn loại sản phẩm) và giá/trừ kho/cộng đã bán tính trên
   `ProductVariant` đó thay vì trên `Product`; nếu sản phẩm không có variant
   nào thì giữ nguyên logic cũ (tính trên `Product`). `CartContext` định danh
   1 dòng giỏ hàng theo cặp `(productId, variantId)` — 2 variant khác nhau
   của cùng 1 sản phẩm là 2 dòng riêng biệt, không gộp số lượng.
3. **Nạp tiền thủ công** (2 kênh, cùng cơ chế admin duyệt — `src/components/
DepositPanel.tsx` + `src/lib/payment/deposit.ts`): `POST
/api/wallet/deposit-request` tạo `WalletTransaction` PENDING — **chưa cộng
   ví**. Admin duyệt tại `/admin` (`POST /api/admin/deposits/[id]` với
   `action: "approve"|"reject"`) mới cộng/từ chối.
   - **Chuyển khoản ngân hàng** (`method: "bank"`, giá trị cũ `"manual"` vẫn
     tương thích ngược): luôn khả dụng kể cả khi chưa cấu hình
     `BANK_NAME`/`BANK_ACCOUNT_NUMBER`/`BANK_ACCOUNT_HOLDER` trong `.env` —
     thiếu thì UI vẫn cho gửi yêu cầu, chỉ ẩn số tài khoản cụ thể (yêu cầu
     liên hệ admin qua Zalo/Messenger). Có cấu hình thì hiện đủ 3 trường +
     mã "nội dung chuyển khoản" (`NAP<6 ký tự cuối user id>`, ổn định theo
     user, lưu vào `note`) để admin đối chiếu sao kê.
   - **USDT mạng TRC20** (`method: "usdt"`): **tắt hoàn toàn** nếu thiếu
     `USDT_TRC20_ADDRESS`/`USDT_VND_RATE` trong `.env` (khác bank — không có
     fallback vì bắt buộc phải có địa chỉ ví thật mới nhận được tiền).
     `WalletTransaction.gatewayRef` lưu TxID người dùng nhập sau khi chuyển
     (bắt buộc, validate ở API); `note` lưu số USDT quy đổi + tỷ giá dùng lúc
     đó. Admin dashboard hiện link "Xem giao dịch trên Tronscan" từ
     `gatewayRef` để đối chiếu on-chain trước khi duyệt — **chưa** có xác
     minh on-chain tự động (không gọi API Tronscan phía server), vẫn là quy
     trình admin tự kiểm tra thủ công như chuyển khoản ngân hàng.
   - Lưu ý cố tình: KHÔNG có giá trị mặc định "trông giống thật" cho số tài
     khoản/địa chỉ ví trong `.env.example` — để trống buộc người triển khai
     phải điền thông tin thật, tránh rủi ro người dùng chuyển nhầm tiền thật
     vào một số tài khoản/địa chỉ ví không xác định do bị đoán/gõ nhầm.
   - `GET /api/wallet/transactions` (dùng riêng cho `DepositPanel`) lọc
     đúng `type: "DEPOSIT"` — trước đây thiếu điều kiện này nên "Lịch sử nạp
     tiền" từng hiện lẫn cả giao dịch PURCHASE/PAYOUT (số âm), đã sửa.
4. **Nạp tiền qua VNPay** (cần env key thật): `POST
/api/payment/vnpay/create` tạo `WalletTransaction` PENDING rồi trả về URL
   VNPay đã ký (HMAC-SHA512). VNPay redirect người dùng về `GET
/api/payment/vnpay/return` — route này **tự xác thực chữ ký** trước khi
   tin bất kỳ tham số nào, rồi cộng ví nếu `vnp_ResponseCode === "00"`.
5. **Giải ngân ký quỹ**: `POST /api/admin/escrow/release` (admin) quét mọi
   `OrderItem` có `status = ESCROW` và `escrowReleaseAt <= now`, chuyển sang
   `RELEASED`, cộng tiền vào ví Seller tương ứng, ghi `WalletTransaction`
   loại PAYOUT. **Chưa có cron job tự động** — cần gọi endpoint này định kỳ
   (Windows Task Scheduler / Vercel Cron / cron trên VPS) khi triển khai thật.
6. **Đăng ký người bán**: `POST /api/seller/register` — 1 user chỉ tạo được
   1 Seller (chặn qua `@unique` trên `userId`), slug tự động từ tên gian
   hàng (thêm hậu tố nếu trùng), nâng `role` → SELLER trong cùng transaction.
7. **Đánh giá seller** (`POST /api/reviews`, trang `/nguoi-ban` +
   `/shop/[seller]`): chỉ chấp nhận nếu người gửi **đã có ít nhất 1
   `OrderItem` mua từ seller đó** (kiểm tra qua `orderItem.findFirst({
sellerId, order: { buyerId } })`) và **không phải chính seller tự đánh
   giá mình**. Đã test: tài khoản chưa từng mua bị chặn với lỗi rõ ràng;
   tài khoản đã mua gửi được đánh giá và thấy ngay trên trang gian hàng +
   trang danh sách người bán.
8. **Đấu giá vị trí vàng** (trang `/dau-gia`, `POST /api/auction/bids`):
   seller chọn 1 sản phẩm **của chính mình** để đặt giá cho 1 trong 6 vị trí;
   giá phải `≥ floorPrice` và `>` giá cao nhất hiện tại của slot đó; kiểm tra
   luôn `walletBalance` đủ tại thời điểm đặt giá (tiền **chưa bị trừ** lúc
   này, chỉ trừ khi thắng). `POST /api/admin/auction/resolve` (admin, cũng
   **chưa có cron tự động** — giống mục giải ngân ký quỹ) đóng các slot đã
   hết hạn: duyệt danh sách bid từ cao xuống thấp, chọn bid đầu tiên mà
   seller đó (qua `User.walletBalance`) đủ tiền làm người thắng (bỏ qua bid
   cao hơn nhưng không đủ tiền thay vì huỷ cả phiên) → trừ ví, ghi
   `WalletTransaction`, set `Product.featuredUntil`, đóng slot cũ, **tự tạo
   slot mới cùng vị trí** để hệ thống xoay vòng liên tục (khác với shopmini.pro
   — họ có lịch cố định 20:00 hàng ngày/Chủ nhật với khoảng nghỉ giữa các
   phiên; hệ thống của MarketMMO nối tiếp phiên ngay lập tức, không có
   khoảng nghỉ). Đã test full luồng: đặt bid → set hạn slot về quá khứ →
   admin resolve → sản phẩm thắng lên đầu carousel "Sản phẩm nổi bật" trang
   chủ với badge "ĐẤU GIÁ NGAY" (phân biệt với badge "TÀI TRỢ" của sản phẩm
   `hot` thường).
9. **Affiliate/giới thiệu** (trang `/affiliate`, mục nav "Affiliate" — trước
   đây là "Kiếm tiền" trỏ tới `/tro-thanh-nguoi-ban`, đã đổi theo yêu cầu):
   mỗi user có 1 `referralCode` (sinh lười nếu chưa có, xem trên) hiển thị
   kèm link mời `/dang-nhap?ref=<code>`. Trang `/dang-nhap` đọc query `ref` và
   truyền xuống `AuthForms` làm giá trị mặc định cho ô "Mã mời" (không bắt
   buộc) ở form đăng ký. `POST /api/auth/register` nhận thêm `refCode`
   optional — nếu hợp lệ, **chỉ** gắn `referredById` (không cộng hoa hồng ở
   bước này, khác thiết kế ban đầu).

   Hoa hồng (`REFERRAL_COMMISSION_VND`, mặc định 20.000đ) chỉ được cộng vào
   ví người giới thiệu khi **cả 3 điều kiện** cùng đúng, kiểm tra trong
   `POST /api/checkout` (không phải lúc đăng ký): (1) đây là **đơn hàng đầu
   tiên** của người được mời (`tx.order.count` trước khi tạo order mới —
   phải đếm trước, nếu không order đang tạo sẽ tự tính vào và luôn sai), (2)
   giá trị đơn hàng đó **vượt** `REFERRAL_MIN_FIRST_ORDER_VND` (mặc định
   20.000đ, hằng số **tách riêng** khỏi `REFERRAL_COMMISSION_VND` dù hiện
   cùng giá trị — để có thể chỉnh 1 trong 2 độc lập sau này), (3) người được
   mời đã có ít nhất 1 `WalletTransaction` loại `DEPOSIT` status `CONFIRMED`
   (xác nhận tiền đến từ nạp tiền thật). Lưu ý quan trọng: điều kiện áp dụng
   **đúng đơn đầu tiên** — nếu đơn đầu tiên không đủ 20.000đ thì các đơn sau
   dù lớn hơn cũng **không** còn kích hoạt được hoa hồng nữa (đã test xác
   nhận hành vi này). Mỗi người được mời chỉ kích hoạt hoa hồng đúng 1 lần,
   đánh dấu qua `User.referralRewarded` (đặt trên chính người được mời, không
   phải người mời, để idempotent). Toàn bộ nằm trong cùng
   `prisma.$transaction` với phần trừ ví/tạo order/trừ kho của checkout.

   `AffiliatePanel.tsx` hiển thị mã/link (nút sao chép), số người đã mời,
   tổng hoa hồng đã nhận (aggregate `WalletTransaction` loại
   `REFERRAL_BONUS`), và danh sách người đã mời kèm badge trạng thái "Đã
   nhận hoa hồng"/"Chưa đủ điều kiện" theo `referralRewarded`. Đã test
   end-to-end bằng Playwright (3 kịch bản): (a) đăng ký qua link `?ref=` → mã
   tự điền đúng ô → checkout ngay khi ví chưa nạp tiền bị chặn đúng lỗi "Số
   dư ví không đủ"; (b) nạp tiền (admin duyệt) → checkout đơn 21.000đ (vượt
   mốc) → ví người giới thiệu cộng đúng 20.000đ, `referralRewarded` chuyển
   `true`; (c) tài khoản khác nạp tiền → checkout đơn đầu tiên chỉ 17.500đ
   (dưới mốc) → **không** cộng hoa hồng, ví người giới thiệu giữ nguyên,
   `referralRewarded` vẫn `false`.
10. **Diễn đàn** (`/dien-dan`, `POST /api/forum/posts` +
    `/api/forum/posts/[postId]/comments` + `/api/forum/posts/[postId]/like`):
    user đăng nhập đăng bài (tiêu đề 5-200 ký tự, nội dung 10-5000 ký tự,
    chọn 1 category trong `FORUM_CATEGORIES`) qua panel `ForumNewPostPanel`
    ở trang danh sách — submit xong redirect thẳng tới trang chi tiết bài
    viết vừa tạo. Trang chi tiết (`/dien-dan/[postId]`) hiển thị nội dung,
    nút thích (`ForumLikeButton`, optimistic update rồi đồng bộ lại theo
    response) và thread bình luận (`ForumCommentForm` + danh sách
    `ForumComment` sắp xếp cũ→mới, đóng vai trò kênh "chat" công khai cho
    từng bài viết). Người chưa đăng nhập vẫn xem được bài + bình luận, nhưng
    nút thích/form bình luận/nút đăng bài đều điều hướng sang `/dang-nhap`
    khi bấm (cùng pattern với `ReviewForm`). Widget "Bài viết tham khảo" ở
    sidebar trang danh mục (`CategorySidebar.tsx`) và mục "BÀI VIẾT THAM
    KHẢO" ở cuối trang chi tiết sản phẩm giờ cũng lấy dữ liệu thật qua
    `getRecentForumPosts()`, link thẳng tới từng bài viết thay vì trang
    `/dien-dan` chung chung như trước. Đã test end-to-end bằng Playwright:
    đăng nhập → mở bài viết → thích (tăng đếm)/bỏ thích (giảm đếm) → gửi
    bình luận (hiện ngay) → đăng bài mới (redirect đúng trang chi tiết).
11. **Quản Lý Bán Hàng** (`/trang-ban-hang`, dashboard người bán đầy đủ, dựng theo
    ảnh tham khảo trang seller dashboard thật của shopmini.pro — sidebar nhiều
    mục). Đăng ký bán hàng xong (`SellerRegisterForm`) giờ redirect thẳng vào
    đây (trước đây redirect sang `/shop/[slug]`). `layout.tsx` guard 2 lớp:
    chưa đăng nhập → `/dang-nhap?callbackUrl=/trang-ban-hang`; đã đăng nhập
    nhưng chưa là seller → `/tro-thanh-nguoi-ban`. Dùng `getAuthSession()`/
    `getSellerForUser()` (`src/lib/authz.ts`, bọc `React.cache()`) để layout
    và các trang con cùng 1 request chỉ tốn đúng 1 lần query session/seller
    thật — **quy ước mới**: mọi trang Server Component cần session/seller nên
    dùng 2 hàm này thay vì tự gọi `auth()`/`prisma.seller.findUnique` lại.

    Sidebar (`SellerSidebar.tsx`) 13 mục, chia 2 nhóm rõ ràng theo quyết định
    phạm vi đã thống nhất với user — **không cố build hết trong 1 lần vì đa
    số phần còn thiếu đụng tiền thật/dữ liệu nhạy cảm, cần luật nghiệp vụ rõ
    trước**:
    - **Có logic thật**: Tổng quan, Sản phẩm (render lại `ProductVariantManager`
      của `/quan-ly-san-pham`, route cũ vẫn giữ song song), Đơn sản phẩm/Đơn
      dịch vụ (tách theo `SERVICE_CATEGORY_SLUGS` — tái dùng đúng heuristic
      "Dịch vụ" đã có ở `NavMegaMenu`, KHÔNG phải field DB thật), Rút tiền,
      Quỹ Bảo Hiểm, Đánh giá, Quảng bá (link thẳng ra `/dau-gia` có sẵn).
    - **"Sắp ra mắt"** (`ComingSoonCard`, chưa có logic): Đặt trước, Mã giảm
      giá, Khiếu nại, Telegram Bot, Xác thực CCCD — xem lý do từng mục trong
      "Còn thiếu" bên dưới.

    **Rút tiền** (`/trang-ban-hang/rut-tien`, `POST /api/seller/withdraw-request`):
    khác hẳn luồng nạp tiền (không đụng số dư cho tới khi admin duyệt) — rút
    tiền **trừ ví NGAY khi tạo yêu cầu** trong 1 `prisma.$transaction` (đọc
    `walletBalance` mới nhất rồi throw nếu không đủ, tránh race condition),
    để seller không thể tạo nhiều yêu cầu rồi tiêu số tiền đó vào việc khác
    (đặt giá đấu, mua hàng) trong lúc chờ duyệt. Lưu vào `WalletTransaction`
    (`type: "WITHDRAW"`, `amount` **âm**, `status: "PENDING"`, `note` chứa
    thông tin ngân hàng nhận tiền seller tự nhập mỗi lần — MarketMMO chưa có
    field lưu tài khoản ngân hàng riêng của seller). Admin duyệt tại `/admin`
    (mục "Yêu cầu rút tiền chờ duyệt", `PATCH /api/admin/withdrawals/[id]`,
    mirror 1:1 pattern `admin/deposits/[id]`): **Duyệt** chỉ đổi trạng thái
    `CONFIRMED` (KHÔNG đụng số dư nữa vì đã trừ lúc tạo yêu cầu — tránh trừ 2
    lần); **Từ chối** hoàn lại đúng số tiền đã khoá (`increment` bằng
    `Math.abs(amount)`) + `status: "REJECTED"`. Đã test end-to-end xác nhận
    đúng cả 2 nhánh (số dư giảm ngay lúc tạo yêu cầu, từ chối hoàn đúng số,
    duyệt không trừ thêm lần nữa) — đây là phần rủi ro cao nhất của tính
    năng nên được ưu tiên test kỹ nhất.

    **Quỹ bảo hiểm** (`/trang-ban-hang/quy-bao-hiem`,
    `POST /api/seller/insurance-deposit`): khác rút tiền — đây là chuyển tiền
    **nội bộ** giữa 2 ví của cùng 1 seller đã xác nhận trong hệ thống (ví
    chính → `Seller.insuranceBalance`), không phải tiền từ/đến ngân hàng
    ngoài nên **tự động duyệt ngay**, không qua admin: 1 `$transaction` trừ
    `walletBalance`, cộng `insuranceBalance`, tạo `WalletTransaction`
    (`type: "INSURANCE_DEPOSIT"`, `status: "CONFIRMED"` ngay). Số dư quỹ bảo
    hiểm cập nhật đồng bộ với badge có sẵn ở trang chi tiết sản phẩm.

    **Tổng quan** (`/trang-ban-hang`, `page.tsx` đọc `searchParams` thay vì
    gọi API riêng — filter khoảng ngày dùng `<Link href="?range=...">`, khớp
    quy ước server-render sẵn có của dự án): 4 stat card — Doanh thu kỳ này
    (`OrderItem` status `RELEASED`), Tiền tạm giữ (status `ESCROW`), Số dư
    ví, Quỹ bảo hiểm. **Khác ảnh tham khảo shopmini.pro**: không có card "Ví
    khiếu nại" (tính năng Khiếu nại chưa xây, không hiển thị số liệu giả cho
    tính năng không tồn tại) và không có nút "Yêu cầu Xóa Shop" (hành động
    khó đảo ngược, không nằm trong yêu cầu ban đầu — cố tình bỏ qua).
12. **Tin nhắn** (`/tin-nhan`, model `Conversation`/`Message`, dựng theo ảnh
    chụp trang chat thật của shopmini.pro): icon chat trên Header (cạnh icon
    giỏ hàng, `HeaderChatButton.tsx`) hiện badge số tin chưa đọc, chỉ hiện
    khi đã đăng nhập. Trang `/tin-nhan` (`ChatInbox.tsx`) — danh sách hội
    thoại bên trái (tìm kiếm phía client, tab Tất cả/Chưa xem) + khung chat
    bên phải, **cập nhật bằng polling** (không dùng WebSocket — quyết định
    phạm vi có chủ đích): danh sách hội thoại poll mỗi 15s, tin nhắn hội
    thoại đang mở poll mỗi 7s.

    `Conversation` dùng 2 user tổng quát (`userAId`/`userBId`, LUÔN chuẩn hoá
    id nhỏ hơn vào `userAId` khi tạo/tìm — xem `getOrCreateConversation()`
    trong `src/lib/system-bot.ts`) thay vì khái niệm buyer/seller cứng, vì
    hội thoại với bot "Hệ Thống" không khớp khung đó. `@@unique([userAId,
userBId])` + `prisma.conversation.upsert` đảm bảo 1 cặp user chỉ có đúng 1
    hội thoại dù ai nhắn trước, tránh race condition.

    **Bot "Hệ Thống"**: chỉ là 1 `User` bình thường được lazy-init qua
    `getSystemBotUser()` (upsert theo email cố định `system@marketmmo.internal`,
    đúng pattern `ensureReferralCode()` trong `src/lib/referral.ts` — không
    backfill qua migration vì dự án dùng `prisma db push`). **Không** thêm
    role `"SYSTEM"` riêng vào `Role` union (bot không có `passwordHash` nên
    không đăng nhập được, tránh thay đổi schema không cần thiết).
    `sendSystemMessage(userId, content)` được gọi ở đúng 2 sự kiện thật
    (khớp ảnh tham khảo, không bịa thêm): `POST /api/auth/register` (tin
    chào mừng) và `POST /api/seller/register` (tin chúc mừng kích hoạt gian
    hàng) — hàm export công khai, sẵn sàng nối thêm sự kiện khác sau này
    (nạp tiền được duyệt, đơn giải ngân...).

    **Điểm vào "Nhắn tin"**: trang `/shop/[seller]` (nút placeholder "Đăng
    nhập để chat" cũ đã có sẵn, nay gắn logic thật) — chưa đăng nhập thấy nút
    cũ (thêm `callbackUrl`), đã đăng nhập và không phải chủ shop thấy nút
    "Nhắn tin" thật trỏ `/tin-nhan?with=<userId của seller>` (tự get-or-create
    hội thoại), chủ shop tự xem gian hàng mình thì ẩn nút. **Chưa có** ở
    BuyBox (trang chi tiết sản phẩm) hay trang chủ — chỉ trang shop.

    Bảo mật: mọi route `/api/messages/conversations/[id]` verify user hiện
    tại là 1 trong 2 người tham gia hội thoại (`userAId`/`userBId`), trả 404
    nếu không — đã test tài khoản không liên quan gọi thẳng API vẫn bị chặn
    đúng. Đã test end-to-end (13 kịch bản Playwright): tin chào mừng/kích
    hoạt gian hàng hiện đúng nội dung, buyer nhắn tin từ trang shop → seller
    thấy tin + badge Header đúng số → seller đọc → badge tự hết → seller trả
    lời → buyer nhận được qua polling (~7s), không cần tải lại trang.

    **Bấm tên/avatar seller trong khung chat → mở gian hàng**: `GET
/api/messages/conversations` trả thêm `otherUser.sellerSlug` (tra
    `prisma.seller.findMany({ where: { userId: { in: otherUserIds } } })`,
    `null` nếu người kia không phải seller/là bot hệ thống). `ChatInbox.tsx`
    chỉ bọc `<Link href="/shop/[slug]">` quanh avatar + tên ở header khung
    chat khi có `sellerSlug` — bot "Hệ Thống" và buyer thường (không phải
    seller) vẫn hiển thị như cũ, không bấm được. Đã test: buyer mở hội thoại
    với seller → bấm tên/avatar → điều hướng đúng `/shop/<slug>` của seller
    đó.

    **Gửi ảnh/file đính kèm**: `Message.attachmentPath`/`attachmentName`/
    `attachmentType` (`"IMAGE"` | `"FILE"`). Lưu qua Vercel Blob hoặc thư mục
    `/uploads/chat/<conversationId>/<uuid ngẫu nhiên>.<ext>` ngoài `/public`
    tuỳ môi trường (xem `saveChatAttachment()` trong `src/lib/uploads.ts` +
    mục "Lưu trữ file" — cùng quy ước bảo mật với ảnh CCCD), chỉ đọc qua
    `GET /api/messages/attachments/[messageId]`
    (verify người gọi thuộc đúng hội thoại chứa tin nhắn đó, 404 nếu không —
    đã test tài khoản khác bị chặn). Ảnh: JPEG/PNG/WebP, tối đa 5MB. File:
    PDF/DOC(X)/XLS(X)/ZIP/TXT, tối đa 10MB — **cố tình chặn mọi định dạng
    khác** (đặc biệt file thực thi) để tránh chat trở thành kênh phát tán mã
    độc. Tên file lưu trên đĩa dùng UUID ngẫu nhiên (không dùng tên gốc, tránh
    path traversal/trùng tên), tên gốc người dùng đặt lưu riêng ở
    `attachmentName` để hiển thị lại đúng. `POST
/api/messages/conversations/[id]` nay nhận `FormData` (trước đây JSON) —
    `content` optional nếu có đính kèm. Danh sách hội thoại hiện
    "[Hình ảnh]"/"[Tệp đính kèm]" thay preview text khi tin cuối chỉ có đính
    kèm. Đã test end-to-end (8 kịch bản riêng): gửi ảnh + gửi file kèm caption
    → người nhận xem/tải được qua link bảo vệ → tài khoản không liên quan bị
    chặn 404 khi cố tải file người khác.

13. **Đăng sản phẩm mới** (`/trang-ban-hang/san-pham`, `POST
/api/seller/products` + `POST /api/admin/products/[id]`): lần đầu tiên
    seller tự tạo được **sản phẩm gốc mới** (trước đây chỉ thêm được
    variant cho sản phẩm có sẵn) — đây là tính năng cốt lõi của marketplace,
    xây theo 2 quyết định phạm vi đã chốt với người dùng:
    - **Cần admin duyệt trước khi hiện công khai** (không hiện ngay) — tránh
      sản phẩm lừa đảo/spam, cùng tinh thần với xác thực CCCD.
    - **Seller upload ảnh thật** (không chỉ dùng icon category chung).

    `AddProductForm.tsx` (nút "Đăng sản phẩm mới" mở form: ảnh + tên +
    danh mục + mô tả ngắn + mô tả chi tiết dạng textarea nhiều dòng — mỗi
    dòng thành 1 phần tử `description: string[]`, khớp đúng shape cũ + giá +
    kho) gửi `FormData` tới `POST /api/seller/products`. Route tạo
    `Product` với `status: "PENDING"` (tường minh, không dựa default), slug
    tự sinh từ tên (thêm hậu tố nếu trùng, cùng pattern `slugifySeller` →
    `slugifyProduct` trong `src/lib/slug.ts`), `attributes` để rỗng `"[]"`
    (chưa có UI nhập, field này hiện không hiển thị ở đâu trong UI nên bỏ
    qua thay vì xây thêm không cần thiết). `SellerProductsPanel.tsx` là
    component điều phối — đổi `key` trên `<ProductVariantManager>` để buộc
    load lại danh sách ngay sau khi đăng sản phẩm mới thành công, không chia
    sẻ state trực tiếp giữa 2 component.

    **Gợi ý tự động danh mục theo tên sản phẩm** (`detectCategorySlug()`
    trong `AddProductForm.tsx`): gõ tên có chứa từ khoá khớp danh mục (vd
    "Gmail", "Facebook"/"FB", "Discord", "Tiktok", "Outlook"/"Hotmail",
    "ChatGPT"/"GPT"/"OpenAI", "Steam", "Twitter"/"X", "Boost"/"Boosting"/
    "cày thuê"/"leveling"/"rank" — bảng `CATEGORY_KEYWORDS`) thì dropdown
    danh mục **tự điền sẵn**, kèm badge nhỏ "Tự động gợi ý" — chỉ là GỢI Ý,
    seller tự bấm chọn lại được bất kỳ lúc nào (bấm 1 lần vào dropdown là
    tắt hẳn auto-suggest cho lần đăng sản phẩm đó, tránh ghi đè lựa chọn cố
    ý của seller). So khớp theo *từ nguyên vẹn* (`\btừ\b`) trên chuỗi đã bỏ
    dấu tiếng Việt (`normalizeVietnamese()`) — quan trọng với từ khoá ngắn
    như "x" (Twitter/X) hay "fb", tránh khớp nhầm vào giữa 1 từ khác (vd
    "x" không khớp vào "Extension"). Đã test 15 kịch bản qua script độc lập
    (trùng khớp đúng từng category + 2 trường hợp không khớp gì, bao gồm
    đúng edge case "x" kể trên) — không cần đăng nhập vì đây là hàm thuần,
    không phụ thuộc DOM/API.

    **Ảnh sản phẩm — công khai, khác hẳn ảnh CCCD/chat**: `saveProductImage()`
    (`src/lib/uploads.ts`) dùng Vercel Blob `access: "public"` giống các
    upload khác, nhưng KHÔNG qua route bảo vệ nào — URL Blob trả về dùng
    thẳng trong `<Image src=...>` vì ảnh sản phẩm vốn phải public cho mọi
    khách xem. Thiếu `BLOB_READ_WRITE_TOKEN` (dev local) thì ghi thẳng vào
    `public/uploads/products/` (khác thư mục `/uploads` ở root dùng cho
    CCCD/chat — thư mục đó nằm NGOÀI `/public`, không public được) để
    Next.js tự phục vụ như static asset bình thường. `next.config.ts` đã
    thêm `images.remotePatterns` cho domain
    `*.public.blob.vercel-storage.com` để `next/image` tối ưu được ảnh Blob.

    **Ẩn/hiện theo trạng thái duyệt**: mọi query công khai trong
    `src/lib/queries.ts` lọc `status: "APPROVED"` — sản phẩm `PENDING`/
    `REJECTED` không xuất hiện ở trang chủ, danh mục, tìm kiếm, sản phẩm liên
    quan, và truy cập thẳng URL chi tiết sản phẩm cũng trả 404 (dù đúng
    slug). Seller vẫn thấy đủ sản phẩm của mình (mọi trạng thái) ở
    `/trang-ban-hang/san-pham` qua `getMySellerProducts()` (hàm này KHÔNG
    lọc status), kèm badge màu (`PRODUCT_STATUS_LABEL`,
    `src/lib/constants.ts`) và lý do từ chối nếu có.

    **Admin duyệt** (`AdminDashboard.tsx`, mục "Sản phẩm chờ duyệt", cùng
    pattern UI với mục xác thực CCCD): `GET /api/admin/products` liệt kê
    sản phẩm `PENDING`/`REJECTED` kèm ảnh/tên/seller/giá; `POST
/api/admin/products/[id]` với `{ action: "approve" | "reject", adminNote? }`
    — Duyệt chuyển `status: "APPROVED"`; Từ chối chuyển `status: "REJECTED"`
    kèm `adminNote` (seller thấy lại lý do này trong trang quản lý sản phẩm
    của mình). Không có bước "sửa rồi gửi lại" — seller bị từ chối phải tạo
    sản phẩm mới (bản ghi cũ giữ nguyên `REJECTED` làm lịch sử).

    **`ProductThumbnail.tsx`** — component dùng chung thay thế hoàn toàn
    việc gọi `getCategoryIcon()` trực tiếp rải rác ở `ProductCard.tsx`/
    `CategoryProductCard.tsx`/`FeaturedCarousel.tsx`/trang chi tiết sản
    phẩm: có `imageUrl` thì hiện `<Image fill>` (ảnh thật), không có thì
    fallback icon category như hành vi gốc — nhận `boxClassName` (kích
    thước/bo góc/nền của khung bọc tại từng nơi gọi, giữ nguyên pixel-chính-
    xác đã đo trước đó) + `iconClassName` để khớp đúng từng nơi mà không cần
    đổi CSS hiện có.

    Đã test toàn bộ luồng qua script Node gọi thẳng Prisma/queries.ts (không
    qua HTTP — Turnstile thật đã chặn đăng nhập tự động ở trình duyệt
    headless, xem mục "Xác minh chống bot" ở Tech Stack): tạo sản phẩm
    `PENDING` → xác nhận ẩn khỏi **cả 5** query công khai (trang chủ, nổi
    bật, theo danh mục, tìm kiếm, chi tiết) → vẫn hiện đúng trong
    `getMySellerProducts` → admin duyệt → xác nhận hiện đúng ở **cả 4** query
    công khai còn lại kèm đúng `imageUrl` → tạo sản phẩm thứ 2, admin từ
    chối kèm lý do → xác nhận lưu đúng `adminNote` và vẫn ẩn khỏi trang công
    khai. Toàn bộ sản phẩm cũ (180 sản phẩm tính cả dữ liệu demo/test tích
    luỹ qua các phiên trước, không chỉ 28 sản phẩm seed gốc) trên cả database
    dev lẫn production đã xác nhận tự động chuyển đúng `status: "APPROVED"`
    sau khi thêm field này, không bị ẩn mất.

### Tài khoản có sẵn sau khi seed (`npm run db:seed`)

| Vai trò     | Email                                                       | Mật khẩu                          | Ghi chú                                                      |
| ----------- | ----------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| Admin       | `admin@marketmmo.pro`                                       | `Admin@123456` (hoặc theo `.env`) | Truy cập `/admin`                                            |
| Buyer demo  | `buyer@marketmmo.pro`                                       | `Buyer@123`                       | Ví sẵn 500.000đ để test mua hàng                             |
| Seller demo | `<slug>@marketmmo.pro` (vd `marketmmo-store@marketmmo.pro`) | `Seller@123`                      | 4 seller: marketmmo-store, accverse, proaccounts, cloudhouse |

> Đây là thông tin đăng nhập cho **môi trường dev/demo** — đổi hoặc xoá các
> tài khoản này trước khi triển khai production thật.

### Domain (khái niệm — đã ánh xạ vào schema ở trên)

- **Delivery tự động**: hiện tại đơn hàng chuyển thẳng sang trạng thái ký quỹ
  ngay sau thanh toán; trường `OrderItem.deliveredPayload` đã có sẵn trong
  schema để lưu nội dung giao hàng (tài khoản/mã kích hoạt) nhưng **chưa có
  UI/logic điền dữ liệu này** — việc "giao hàng" hiện chỉ mang tính khái
  niệm qua trạng thái đơn hàng.
- **Review/Rating**: đánh giá **Seller** (gian hàng) đã hiện thực thật —
  xem mục "Luồng nghiệp vụ chính" ở trên. Riêng `Product.rating`/
  `reviewCount` (điểm sao hiển thị trên từng thẻ sản phẩm) **vẫn là số tĩnh
  từ seed**, chưa gắn với bảng `Review` — đây là 2 hệ thống rating tách biệt
  có chủ đích (đánh giá theo gian hàng, không theo từng sản phẩm), xem
  checklist nếu muốn mở rộng sang review theo sản phẩm.
- **Referral/Affiliate**: đã hiện thực thật — xem mục "Luồng nghiệp vụ chính"
  (mục 9) và trang `/affiliate`.

## Quy tắc bắt buộc

Các quy tắc sau **luôn phải tuân thủ** khi phát triển MarketMMO, không phải gợi ý:

1. **Screenshot đối chiếu design**: sau mỗi thay đổi UI lớn (thêm/sửa section,
   trang mới, layout mới), chạy `npm run dev`, dùng `npm run screenshot` (script
   Playwright tại `scripts/screenshot.mjs`) để chụp lại trang, rồi so sánh với
   thiết kế gốc trước khi coi là hoàn thành.
   - Ảnh tĩnh `shopmini.pro__category=Gmail.png` chỉ có độ phân giải thấp
     (190×385px) nên **không dùng làm nguồn đối chiếu chính** — chỉ hữu ích ở
     mức bố cục/màu sắc tổng thể.
   - Nguồn đối chiếu chính xác hơn: chụp trực tiếp các trang sống trên
     shopmini.pro (ví dụ bằng một script Playwright tạm thời, `waitUntil:
"load"` thay vì `"networkidle"` vì site có long-poll/chat widget khiến
     `networkidle` không bao giờ đạt được) rồi so bố cục, thứ tự section, và
     nội dung field với trang MarketMMO tương ứng. Đã áp dụng cách này cho
     trang chủ, danh mục, chi tiết sản phẩm, đăng nhập, gian hàng người bán.
   - Script `npm run screenshot` mặc định cuộn qua toàn trang trước khi chụp
     để các section có scroll-animation (mục 3 bên dưới) đã hiển thị đầy đủ
     trong ảnh full-page.
2. **Mobile-friendly bắt buộc**: mọi trang/component phải responsive, kiểm tra
   hiển thị tốt trên mobile (không chỉ desktop) trước khi báo hoàn thành — bao
   gồm cả banner danh mục dạng icon ngang và danh sách sản phẩm dạng hàng.
3. **Animation khi scroll cho mọi section**: mỗi section trên trang (banner,
   danh mục, danh sách sản phẩm, footer...) phải có hiệu ứng xuất hiện khi cuộn
   tới (scroll-triggered animation — vd: fade-in/slide-up), không hiển thị tĩnh
   ngay lập tức.

## Quy ước code

- TypeScript strict; component UI tách khỏi logic dữ liệu. Trang lấy dữ liệu
  thật qua `src/lib/queries.ts` (Prisma) — không import trực tiếp
  `src/data/*.ts` trong trang nữa (file đó giờ chỉ là nguồn seed).
- Component dùng chung đặt tại `src/components/`, mỗi component một file, đặt
  tên PascalCase trùng tên file.
- Mọi section cấp trang bọc trong `Reveal` (`src/components/Reveal.tsx`) để có
  scroll animation đồng nhất — không tự viết animation riêng lẻ khác.
- Màu sắc dùng qua CSS variables/utility đã khai báo trong
  `src/app/globals.css` (`bg-brand`, `bg-ink`, `bg-surface-alt`,
  `text-danger`, `border-border-c`...) — không hardcode mã hex mới trong
  component trừ khi thật sự cần.
- Không thêm thư viện/abstraction ngoài phạm vi cần thiết cho từng tính năng.
- Mọi thao tác đổi tiền/tồn kho (checkout, duyệt nạp tiền, giải ngân) phải bọc
  trong `prisma.$transaction(...)` để tránh lệch số dư khi có lỗi giữa chừng —
  xem ví dụ ở `src/app/api/checkout/route.ts`.
- API route bảo vệ bằng `requireUser()`/`requireAdmin()`
  (`src/lib/authz.ts`) — không tự viết lại logic kiểm tra session/role.
- **Prisma `orderBy` trên field nullable + DESC**: Postgres mặc định xếp
  `NULL` **lên đầu** khi `ORDER BY x DESC` (ngược trực giác). Nếu field đó
  chỉ có giá trị ở một số ít record (như `Product.featuredUntil`) và bạn
  muốn ưu tiên record có giá trị lên trước, phải chỉ định tường minh
  `orderBy: { field: { sort: "desc", nulls: "last" } }` — thiếu dòng này đã
  gây lỗi thật (`getFeaturedProducts` trả toàn record `hot=true` có
  `featuredUntil=null`, sản phẩm thắng đấu giá bị `take` cắt mất dù đúng ra
  phải đứng đầu). Xem `src/lib/queries.ts`.
- **Component đếm ngược thời gian thật (`AuctionCountdown`)**: không tính
  giá trị giây/phút ngay trong lần render đầu (kể cả `useState(() =>
...)`) vì server và client sẽ tính ở 2 mili-giây khác nhau → hydration
  mismatch. Khởi tạo state là `null`, chỉ tính giá trị thật trong
  `useEffect` (chạy sau khi mount ở client), render placeholder tĩnh trong
  lúc chờ.

## Việc cần làm tiếp theo

Đã xây xong (frontend + **backend thật**, đã kiểm thử end-to-end):

- [x] Trang chủ, danh mục, chi tiết sản phẩm, gian hàng người bán — dữ liệu
      **thật từ PostgreSQL qua Prisma** (không còn mock trong trang), 28 sản
      phẩm phủ đủ 10 category.
- [x] **PostgreSQL qua Docker** (nâng cấp từ SQLite ban đầu): container riêng
      biệt cho dự án (`docker-compose.yml`, cổng host 5433 để không đụng
      stack Docker khác đang chạy sẵn trên máy). Đã kiểm thử lại toàn bộ luồng
      (đăng nhập, mua hàng trừ ví, trang admin) trên Postgres — hoạt động y
      hệt như trên SQLite trước đó.
- [x] **Auth thật**: đăng ký/đăng nhập bằng Auth.js (Credentials + Google tuỳ
      chọn), mật khẩu hash bcrypt, session JWT. Header hiển thị số dư ví/tên
      user thật khi đã đăng nhập, có nút đăng xuất.
- [x] **Giỏ hàng + thanh toán thật**: `CartContext` lưu snapshot sản phẩm vào
      `localStorage`; nút "Mua ngay" / thanh toán giỏ hàng gọi
      `POST /api/checkout` — trừ ví, giảm tồn kho, tạo `Order`/`OrderItem` với
      trạng thái ký quỹ (`ESCROW`) thật trong DB. Đã test: mua hàng → số dư ví
      giảm đúng, đơn hàng hiện đúng trạng thái và ngày giải ngân dự kiến.
- [x] **Ví/nạp tiền thật**: yêu cầu nạp thủ công (admin duyệt) hoạt động đầy
      đủ; khung tích hợp VNPay đã viết đúng spec (HMAC-SHA512) nhưng **cần
      `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET` thật** mới dùng được — hiện tự động
      ẩn/disable nếu thiếu key.
- [x] **Trang quản trị** (`/admin`, chỉ role ADMIN): duyệt/từ chối yêu cầu nạp
      tiền, chạy giải ngân ký quỹ đến hạn. Đã test: duyệt nạp tiền cộng đúng
      ví, giải ngân chuyển đúng trạng thái `OrderItem`/`Order` và cộng đúng
      tiền vào ví seller.
- [x] **Đăng ký bán hàng thật**: tạo `Seller` record + nâng role user, redirect
      thẳng tới gian hàng mới tạo. Đã test bằng luồng đăng ký tài khoản mới →
      trở thành người bán → xem gian hàng.
- [x] **Trang "Người Bán" (`/nguoi-ban`)** — link ngay sau "Đăng Ký Bán Hàng"
      trong nav: liệt kê toàn bộ seller kèm số sản phẩm đang bán và rating
      trung bình. Trang gian hàng (`/shop/[seller]`) hiện rating thật (thay
      cho "Tín nhiệm: 100" cố định trước đây) + danh sách bình luận đánh giá + form gửi đánh giá 1-5 sao. Đã test: chặn đúng người chưa mua hàng
      không cho đánh giá, chặn seller tự đánh giá mình, gửi đánh giá thành
      công cập nhật ngay cả trang gian hàng lẫn trang danh sách người bán.
- [x] **Công cụ Lấy 2FA** (`/lay-2fa`): tính mã TOTP thật (RFC 6238, HMAC-SHA1
      qua Web Crypto API, `src/lib/totp.ts`) hoàn toàn phía client — không gửi
      mã bí mật đi đâu. Đã kiểm chứng khớp 100% với phép tính độc lập.
- [x] Trang Diễn đàn, và các trang pháp lý: FAQ, Điều khoản dịch vụ, Điều
      khoản bán hàng, Chính sách bảo mật, Sitemap, Tài liệu API.
- [x] **Header khớp shopmini.pro pixel-chính-xác** (đo trực tiếp trên site
      của họ): chiều cao thanh chính/nav trắng/ô tìm kiếm, cỡ chữ nav 16px,
      thứ tự màu nút Đăng nhập/Đăng ký, dropdown mega-menu hover cho Sản
      phẩm/Dịch vụ/Nạp tiền (`NavMegaMenu.tsx`), logo bỏ ".PRO".
- [x] **Đấu giá "vị trí vàng"** (`/dau-gia`) — hệ thống thật, không phải giao
      diện tĩnh: đặt giá (`AuctionBidForm`), đếm ngược thật (`AuctionCountdown`),
      admin giải quyết phiên + xoay vòng slot mới, sản phẩm thắng tự động lên
      carousel "Sản phẩm nổi bật" trang chủ (khung trắng bo góc + badge "ĐẤU
      GIÁ NGAY" khớp shopmini.pro). Đã test full luồng bid → resolve → hiển thị.
- [x] **Affiliate/giới thiệu** (`/affiliate`, mục nav đổi tên từ "Kiếm tiền"):
      mã giới thiệu 8 ký tự/user (sinh lười cho tài khoản cũ, sinh ngay lúc
      đăng ký cho tài khoản mới), link mời `/dang-nhap?ref=<code>` tự điền ô
      "Mã mời" ở form đăng ký. Hoa hồng 20.000đ (`REFERRAL_COMMISSION_VND`)
      chỉ cộng vào ví người giới thiệu khi người được mời **đã nạp tiền thật
      + đơn hàng đầu tiên vượt** `REFERRAL_MIN_FIRST_ORDER_VND` (20.000đ) —
      kiểm tra trong `POST /api/checkout`, không phải lúc đăng ký (đăng ký chỉ
      gắn quan hệ). Đánh dấu qua `User.referralRewarded` để chỉ kích hoạt
      đúng 1 lần/người được mời — nếu đơn đầu tiên không đủ mốc, các đơn sau
      dù lớn hơn cũng không còn tính. `AffiliatePanel` hiển thị mã/link (nút
      sao chép), thống kê số người đã mời + tổng hoa hồng, danh sách người đã
      mời kèm badge "Đã nhận hoa hồng"/"Chưa đủ điều kiện". Đã test end-to-end
      3 kịch bản (đăng ký → checkout khi chưa nạp tiền bị chặn; nạp tiền +
      đơn > mốc → cộng đúng 20.000đ; đơn đầu tiên < mốc → không cộng) — xem
      chi tiết mục 9 "Luồng nghiệp vụ chính".
- [x] **Biến thể/gói sản phẩm** (`/quan-ly-san-pham`, model `ProductVariant`):
      seller tự thêm/xoá các gói cho sản phẩm CỦA MÌNH (vd Gmail: theo
      quốc gia domain, thời hạn thuê...), mỗi gói có giá/kho riêng. Trang chi
      tiết sản phẩm bắt buộc chọn 1 gói trước khi mua khi sản phẩm có gói
      (ẩn ô mô tả ngắn, thay bằng lưới chọn gói kiểu shopmini.pro — chọn =
      viền brand, hết hàng = gạch ngang "Hết hàng"). Checkout/giỏ hàng tính
      đúng giá + trừ đúng kho của gói đã chọn (không đụng vào
      `Product.stock`), lưu `variantId`/`variantLabel` snapshot trên
      `OrderItem` để lịch sử đơn hàng vẫn hiển thị đúng gói đã mua kể cả sau
      khi seller xoá gói đó. Đã test full luồng: seller thêm 3 gói (1 gói
      hết hàng) → buyer chọn đúng gói còn hàng → mua → kiểm tra DB đúng
      giá/variantId + kho gói giảm đúng + kho sản phẩm gốc không đổi + lịch
      sử đơn hàng hiện đúng tên gói.
- [x] **Diễn đàn thật** (`/dien-dan`, model `ForumPost`/`ForumComment`/
      `ForumLike`, thay cho mock `src/data/posts.ts` đã xoá): user đăng nhập
      đăng bài, bình luận (đóng vai trò "chat" công khai theo từng bài viết —
      không phải chat real-time riêng tư), và thả tim 1 bài viết (bấm lại để
      bỏ thích). Trang chi tiết `/dien-dan/[postId]` mới. Widget "Bài viết
      tham khảo" (sidebar danh mục) và "BÀI VIẾT THAM KHẢO" (cuối trang chi
      tiết sản phẩm) đổi sang dữ liệu thật, link thẳng tới từng bài. Xem chi
      tiết mục 10 "Luồng nghiệp vụ chính". Đã test end-to-end bằng Playwright
      (đăng nhập → thích/bỏ thích đổi đúng số đếm → gửi bình luận hiện ngay
      → đăng bài mới redirect đúng trang chi tiết).
- [x] **Quản Lý Bán Hàng** (`/trang-ban-hang`, dashboard người bán đầy đủ dựng
      theo ảnh tham khảo shopmini.pro): sidebar 13 mục, đăng ký seller xong
      redirect thẳng vào đây. **Toàn bộ 13 mục đều có logic thật** (không còn
      mục "Sắp ra mắt" nào) — Tổng quan (doanh thu theo khoảng ngày), Sản
      phẩm, Đơn sản phẩm/Đơn dịch vụ, **Rút tiền** (trừ ví ngay khi tạo yêu
      cầu, admin duyệt/từ chối tại `/admin`, từ chối hoàn đúng tiền — không
      double-refund/double-deduct), **Quỹ bảo hiểm** (nạp thật, tự động duyệt
      vì là chuyển nội bộ), Đánh giá, Quảng bá (link `/dau-gia`), **Đặt
      trước**, **Mã giảm giá**, **Khiếu nại**, **Telegram Bot**, **Xác thực
      CCCD** — xem chi tiết từng mục ở mục 11-15 "Luồng nghiệp vụ chính". Đã
      test end-to-end bằng Playwright cho cả 13 mục: guard đăng nhập/seller
      đúng cả 2 nhánh redirect, đăng ký seller mới → vào đúng Quản Lý Bán Hàng,
      và **đặc biệt đã test kỹ luồng rút tiền** (tạo 2 yêu cầu → số dư trừ
      ngay cả 2 lần → admin từ chối 1 → hoàn đúng số tiền → admin duyệt 1 →
      số dư không đổi thêm → khớp chính xác từng đồng qua toàn bộ chuỗi).
- [x] **Đặt trước** (`/trang-ban-hang/dat-truoc`, `Product.preOrder`): seller
      đánh dấu sản phẩm "sắp có hàng" (`PATCH /api/seller/products/[id]`),
      buyer vẫn trả 100% tiền như checkout thường (tận dụng đúng hệ thống ký
      quỹ có sẵn, không xây luồng đặt cọc riêng) — `POST /api/checkout` **bỏ
      qua kiểm tra tồn kho** cho sản phẩm có `preOrder=true`, `stock` có thể
      xuống âm làm tín hiệu "nợ hàng". Trang dashboard liệt kê sản phẩm kèm
      toggle bật/tắt + danh sách đơn đặt trước đang chờ giao (`getSellerPreOrderItems`,
      lọc `status: "ESCROW"` trên sản phẩm có `preOrder=true`). Badge "ĐẶT
      TRƯỚC" (icon `Clock`, nền `bg-info`) hiện trên `ProductCard`. Đã test:
      bật preOrder → mua sản phẩm dù hết hàng vẫn thành công.
- [x] **Mã giảm giá** (`/trang-ban-hang/ma-giam-gia`, model `DiscountCode`):
      seller tạo mã (% hoặc số tiền cố định, giới hạn số lần dùng/hạn dùng
      tuỳ chọn) áp dụng cho **toàn bộ sản phẩm của chính mình** — không giảm
      chéo sang sản phẩm seller khác trong cùng giỏ hàng. Buyer nhập mã ở
      `/gio-hang` (xem trước số tiền giảm qua `POST /api/discount-codes/preview`,
      không tăng `usedCount`), áp dụng thật khi `POST /api/checkout` (tự tính
      lại độc lập, không tin số liệu preview từ client — tránh giả mạo). Logic
      chia đều số tiền giảm cho từng dòng hàng nằm ở `src/lib/discount.ts`
      (`computeDiscountAmount`/`distributeDiscount`) — **quan trọng**: số tiền
      giảm thực tế (`actualDiscount`) phải suy ra từ giá nguyên VNĐ sau khi
      làm tròn (`Math.floor(lineTotal / quantity)`), KHÔNG dùng số dự kiến
      trước khi làm tròn — nếu không, tổng tiền buyer bị trừ có thể lệch vài
      đồng so với tổng các `OrderItem.price × quantity` đã lưu (bug thật bắt
      được qua script test độc lập trước khi tích hợp vào checkout, xem lịch
      sử). Có sàn `MIN_ITEM_PRICE_AFTER_DISCOUNT` (1.000đ) để mã FIXED lớn
      không đưa giá 1 sản phẩm về gần 0. `usedCount` tăng NGAY TRONG cùng
      `$transaction` với checkout để tránh race condition (2 checkout dùng
      chung mã `maxUses=1` cùng lúc). Đã test: tạo mã giảm 20% → áp dụng giỏ
      hàng → tổng tiền trừ đúng → `usedCount` tăng đúng 1.
- [x] **Khiếu nại** (`/trang-ban-hang/khieu-nai`, model `Dispute`): buyer HOẶC
      seller mở khiếu nại trên 1 `OrderItem` đang `ESCROW` (nút "Mở khiếu nại"
      ở `/don-hang`, `POST /api/disputes`) — chuyển status sang `DISPUTED`
      (loại khỏi vòng giải ngân tự động của `/api/admin/escrow/release`, chỉ
      xử lý status `ESCROW`). **Chỉ admin quyết định kết quả cuối**
      (`/admin`, `POST /api/admin/disputes/[id]`): "Hoàn tiền người mua"
      (status → `CANCELLED`, hoàn 100% vào ví buyer, `WalletTransaction`
      type `REFUND` — lần đầu tiên type này thật sự được tạo ra) hoặc "Giải
      ngân người bán" (status → `RELEASED`, cộng ví seller, type `PAYOUT`,
      giống hệt luồng escrow release bình thường). Không có hoàn tiền một
      phần — giữ đúng pattern "admin tự quyết, không có logic % phức tạp"
      xuyên suốt dự án. Trang dashboard seller chỉ hiển thị danh sách khiếu
      nại + trạng thái (đọc, không tự xử lý). Đã test: buyer mở khiếu nại →
      admin hoàn tiền buyer → ví buyer cộng đúng số tiền.
- [x] **Telegram Bot** (`/trang-ban-hang/telegram-bot`, `Seller.telegramChatId`/
      `telegramLinkCode`): env-gated giống VNPay (`TELEGRAM_BOT_TOKEN` trong
      `.env`, thiếu thì UI tự hiện thông báo "chưa cấu hình", không chặn phần
      còn lại của app). Luồng liên kết **không cần webhook công khai** (khó
      test ở dev local) — seller tự lấy Chat ID của mình (vd nhắn
      @userinfobot), nhập vào form, server gọi Telegram `sendMessage` gửi mã
      xác nhận 6 số tới đúng Chat ID đó, seller nhập lại mã để xác nhận đúng
      là Chat ID của họ (chỉ cần gọi API Telegram một chiều — outbound). Có
      nút "Gửi tin nhắn thử" sau khi liên kết. Đã test: đúng trạng thái "chưa
      cấu hình" hiển thị khi thiếu `TELEGRAM_BOT_TOKEN` (chưa test gửi tin
      nhắn thật vì chưa có bot token thật — cần điền `.env` giống quy trình
      VNPay để test đầy đủ).
- [x] **Xác thực CCCD** (`/trang-ban-hang/xac-thuc-cccd`, model
      `SellerVerification`): seller upload ảnh CCCD 2 mặt (JPEG/PNG/WebP, tối
      đa 5MB/ảnh, `src/lib/uploads.ts`) + họ tên/số CCCD. **Ảnh không public**
      (Vercel Blob URL ngẫu nhiên hoặc thư mục `/uploads` ngoài `/public` ở
      dev local, xem mục "Lưu trữ file" — `.gitignore` không commit thư mục
      này), chỉ đọc được qua route được bảo vệ (`GET
/api/seller/verification/image/[side]` — chỉ chính seller đó; `GET
/api/admin/verifications/[id]/image/[side]` — chỉ admin), không public như
      logo/ảnh sản phẩm. Admin duyệt tại `/admin` (`POST
/api/admin/verifications/[id]`): **Duyệt** đặt `SellerVerification.status =
      "APPROVED"` VÀ set `Seller.verified = true` (tích hợp thật vào badge
      "Đã xác thực" đã có sẵn trên trang gian hàng/thẻ sản phẩm, không chỉ là
      cờ hiển thị nội bộ) trong cùng transaction; **Từ chối** chỉ đổi status,
      kèm `adminNote`. Đã test: seller upload → admin xem ảnh qua link bảo
      vệ → duyệt → `Seller.verified` chuyển `true` → badge "Đã xác thực" hiện
      đúng trên trang gian hàng công khai.
- [x] **Tin nhắn** (`/tin-nhan`, model `Conversation`/`Message`, dựng theo
      ảnh chụp trang chat thật của shopmini.pro): icon chat trên Header (badge
      số tin chưa đọc, poll 15s) + trang inbox đầy đủ (danh sách hội thoại +
      khung chat, poll tin nhắn hội thoại đang mở mỗi 7s — không dùng
      WebSocket, quyết định phạm vi có chủ đích). Bot "Hệ Thống" tự động gửi
      tin chào mừng khi đăng ký tài khoản + tin chúc mừng khi đăng ký bán
      hàng (2 sự kiện khớp đúng ảnh tham khảo). Buyer/seller nhắn tin thật
      qua nút "Nhắn tin" ở trang shop (`/shop/[seller]`, gắn vào đúng nút
      placeholder "Đăng nhập để chat" đã có sẵn từ trước). Xem chi tiết mục
      12 "Luồng nghiệp vụ chính". Hỗ trợ **gửi ảnh/file đính kèm** (ảnh tối
      đa 5MB, file tài liệu — PDF/DOC(X)/XLS(X)/ZIP/TXT — tối đa 10MB, chặn
      mọi định dạng khác kể cả file thực thi), lưu ngoài `/public` giống ảnh
      CCCD, chỉ đọc qua route bảo vệ. Đã test end-to-end 21 kịch bản
      Playwright (13 luồng chat text + 8 luồng đính kèm): 2 tin hệ thống
      đúng nội dung, buyer nhắn seller → seller thấy tin + badge đúng số →
      đọc → badge hết → trả lời → buyer nhận qua polling không cần tải lại
      trang; gửi ảnh/file kèm caption → người nhận xem/tải được; tài khoản
      không liên quan bị chặn 404 khi gọi thẳng API hội thoại/đính kèm
      người khác (không rò rỉ tin nhắn/file).
- [x] **Quên mật khẩu** (`/quen-mat-khau` → `/dat-lai-mat-khau`, model
      `PasswordResetToken`): link "Quên mật khẩu?" ở form đăng nhập
      (`AuthForms.tsx`) → `POST /api/auth/forgot-password` nhận email, luôn
      trả **cùng 1 message chung chung** dù email có tồn tại hay không (tránh
      dò tài khoản) — chỉ thực sự tạo token + gửi mail nếu user tồn tại **và**
      có `passwordHash` (tài khoản chỉ đăng nhập Google thì không có gì để
      "đặt lại", bỏ qua). Token là 32 byte ngẫu nhiên (`crypto.randomBytes`),
      **chỉ lưu SHA-256 hash trong DB** (`PasswordResetToken.tokenHash`),
      token gốc chỉ nằm trong link email — rò rỉ DB không dùng được để reset
      mật khẩu người khác. Hết hạn sau
      `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` (60 phút,
      `src/lib/constants.ts`), tạo token mới tự xoá mọi token cũ chưa dùng
      của user đó (chỉ 1 link hiệu lực tại 1 thời điểm). `POST
/api/auth/reset-password` verify hash + hạn + chưa dùng (`usedAt`) trước khi
      đổi `passwordHash`, đánh dấu `usedAt` ngay trong cùng
      `$transaction` — token dùng lại lần 2 bị từ chối đúng (đã test).

      **Gửi email qua Resend** (`src/lib/email.ts`, `sendPasswordResetEmail`)
      — cùng quy ước env-var-gated như VNPay/Telegram: thiếu `RESEND_API_KEY`
      thì **không chặn luồng**, chỉ `console.log` link reset ra log server
      (đủ để test toàn bộ luồng ở dev/demo mà không cần key thật).
      `RESEND_FROM_EMAIL` mặc định dùng địa chỉ sandbox
      `onboarding@resend.dev` của Resend — địa chỉ này **chỉ gửi được tới
      đúng email đã đăng ký tài khoản Resend**, cần xác minh 1 domain thật
      trên Resend rồi đổi `RESEND_FROM_EMAIL` sang `@domain đó` mới gửi được
      cho người dùng bất kỳ ở production. Đã test end-to-end qua nhánh
      log-fallback (chưa test gửi mail thật vì chưa có `RESEND_API_KEY`):
      đăng ký tài khoản mới → quên mật khẩu → lấy link từ log server → đặt
      mật khẩu mới → đăng nhập bằng mật khẩu **cũ** bị từ chối đúng → đăng
      nhập bằng mật khẩu **mới** thành công → dùng lại đúng token đó lần 2 bị
      từ chối ("không hợp lệ hoặc đã hết hạn") → truy cập `/dat-lai-mat-khau`
      không kèm `?token=` hiện đúng thông báo link không hợp lệ.
- [x] **Đăng nhập Google & xác minh chống bot Turnstile — xác nhận vẫn hoạt
      động đúng**: 2 tính năng này **code đã có sẵn từ trước** (không phải
      xây mới), chỉ đang ẩn vì `.env` để trống `AUTH_GOOGLE_ID`/
      `AUTH_GOOGLE_SECRET` và `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/
      `TURNSTILE_SECRET_KEY` — điền đúng 4 biến này vào `.env` (lấy từ Google
      Cloud Console/Cloudflare dashboard) là 2 nút "Đăng nhập với Google" và
      widget xác minh bot sẽ tự hiện ra ở cả form đăng nhập lẫn đăng ký, không
      cần sửa code gì thêm — xem `AuthForms.tsx`/`src/app/dang-nhap/page.tsx`.
- [x] **Lưu trữ file sẵn sàng deploy Vercel** (`src/lib/uploads.ts`): ảnh CCCD
      + đính kèm chat trước đây chỉ ghi ổ đĩa cục bộ — sẽ mất trên môi trường
      serverless của Vercel (filesystem không lưu trữ lâu dài). Đã thêm
      **Vercel Blob** (`@vercel/blob`) làm chế độ lưu trữ chính khi có
      `BLOB_READ_WRITE_TOKEN`, tự rơi về ổ đĩa cục bộ khi thiếu token (dev
      local) — xem mục "Lưu trữ file" trong Backend. Đã test round-trip lưu/
      đọc cho cả 2 loại file (script Node độc lập gọi thẳng
      `saveChatAttachment`/`saveVerificationImage`/`readUploadedFile`, không
      qua HTTP — vì Turnstile thật đã bật nên trình duyệt headless không tự
      vượt qua được bước đăng nhập để test qua UI).
- [x] **Đăng sản phẩm mới** (`/trang-ban-hang/san-pham`, model `Product`
      thêm `imageUrl`/`status`/`adminNote`): tính năng cốt lõi của
      marketplace — seller lần đầu tự tạo được sản phẩm gốc mới (trước đây
      chỉ thêm được variant cho sản phẩm có sẵn qua seed). 2 quyết định
      phạm vi đã chốt: **cần admin duyệt** trước khi hiện công khai (giống
      xác thực CCCD) và **seller upload ảnh thật** (dùng lại hạ tầng Vercel
      Blob, nhưng public — không qua route bảo vệ như CCCD/chat). Xem chi
      tiết mục 13 "Luồng nghiệp vụ chính". Đã test toàn bộ luồng qua script
      Node gọi thẳng Prisma/queries.ts: sản phẩm PENDING ẩn khỏi cả 5 query
      công khai (trang chủ/nổi bật/danh mục/tìm kiếm/chi tiết) nhưng vẫn
      hiện trong trang quản lý của seller → admin duyệt → hiện đúng công
      khai kèm ảnh → luồng từ chối lưu đúng lý do, vẫn ẩn khỏi trang công
      khai → xác nhận 180 sản phẩm cũ (dev + production) tự động chuyển
      đúng `status: "APPROVED"` sau khi thêm field, không bị ẩn mất.

Còn thiếu / cần làm tiếp:

- [ ] **Đăng sản phẩm mới — còn thiếu nhỏ**: sản phẩm bị admin từ chối
      (`REJECTED`) không có luồng "sửa rồi gửi lại" — seller phải đăng sản
      phẩm hoàn toàn mới, bản ghi cũ giữ nguyên làm lịch sử (chấp nhận được
      cho v1, có thể xây thêm sau nếu cần). Seller cũng không xem trước được
      trang chi tiết công khai của sản phẩm đang chờ duyệt (URL đó 404 cho
      tới khi được duyệt) — chỉ xem thông tin tóm tắt (ảnh/tên/giá) trong
      trang quản lý. `Product.attributes` vẫn để trống `"[]"` lúc tạo (chưa
      có UI nhập) — giữ nguyên vì trường này hiện không hiển thị ở đâu trong
      UI, không phải giới hạn thật.
- [ ] **Tin nhắn — còn thiếu nhỏ**: nút "Nhắn tin" mới có ở trang shop, chưa
      có ở BuyBox (trang chi tiết sản phẩm) hay trang chủ. Chưa nối thêm sự
      kiện hệ thống khác (nạp tiền được duyệt, đơn giải ngân...) —
      `sendSystemMessage()` (`src/lib/system-bot.ts`) đã sẵn sàng để nối
      thêm, chỉ 2 sự kiện khớp ảnh tham khảo hiện có. (Gửi ảnh/file đính kèm
      đã xây xong — xem mục 12 "Luồng nghiệp vụ chính".)
- [ ] **Mã giảm giá chưa tích hợp vào BuyBox**: mới hoạt động ở `/gio-hang`
      (giỏ hàng) — nút "Mua ngay" ở `BuyBox.tsx` (trang chi tiết sản phẩm)
      chưa có ô nhập mã dù `POST /api/checkout` đã hỗ trợ `discountCode` cho
      cả 2 luồng. Cần thêm UI tương tự khi có thời gian.
- [ ] **Telegram Bot chưa test với token thật**: framework đã hoàn chỉnh
      (link/confirm/unlink/test message) nhưng chưa gọi qua Telegram API thật
      lần nào (thiếu `TELEGRAM_BOT_TOKEN`). Cũng **chưa có thông báo tự động**
      khi có đơn hàng mới/khiếu nại mới — hiện chỉ có nút "Gửi tin nhắn thử"
      thủ công; nếu muốn tự động, cần gọi `sendTelegramMessage()`
      (`src/lib/telegram.ts`) từ trong `POST /api/checkout`/`POST
/api/disputes` khi seller đã liên kết.
- [ ] **Sửa biến thể**: `/quan-ly-san-pham` hiện chỉ **thêm/xoá** biến thể
      (API `PATCH` sửa label/giá/kho đã có sẵn ở
      `seller/products/[productId]/variants/[variantId]/route.ts` nhưng
      **chưa có UI** gọi tới nó — cần thêm form sửa inline). (Tạo sản phẩm
      gốc mới cho seller **đã xây xong** — xem mục "Đăng sản phẩm mới".)

- [ ] **Cron tự động cho các tác vụ "giải quyết định kỳ"**: cả
      `/api/admin/escrow/release` **và** `/api/admin/auction/resolve` hiện
      phải bấm tay trong `/admin` — cần lên lịch gọi định kỳ (Vercel Cron /
      Windows Task Scheduler / cron trên VPS) khi triển khai thật. Gợi ý: gọi
      `/api/admin/auction/resolve` mỗi phút là đủ (không tốn kém vì hầu hết
      lần gọi sẽ không có slot nào hết hạn).
- [ ] **Lịch đấu giá cố định**: hệ thống hiện xoay vòng slot ngay khi resolve
      (không có khoảng nghỉ), khác với lịch cố định 20:00 hàng ngày/Chủ nhật
      của shopmini.pro — nếu muốn khớp chính xác lịch đó, cần thêm logic tính
      `startAt`/`endAt` theo giờ cố định thay vì `now + duration`.
- [ ] **VNPay production**: cần đăng ký merchant thật, điền
      `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET` vào `.env`. Đã sửa 1 bug thật khi rà
      lại code trước khi dùng key thật: `signData` (chuỗi ký HMAC) từng dùng
      `encodeURIComponent` thường (giữ `%20` cho khoảng trắng) trong khi VNPay
      yêu cầu kiểu `application/x-www-form-urlencoded` (khoảng trắng → `+`) —
      sai chữ ký với bất kỳ field nào có khoảng trắng (vd `vnp_OrderInfo`, luôn
      xảy ra vì `orderInfo` có dạng "Nap tien vi MarketMMO - ..."). Đã sửa +
      viết script test round-trip xác nhận: tạo URL thanh toán → giả lập
      VNPay ký phản hồi bằng cùng thuật toán → `verifyVnpayReturn` chấp nhận
      đúng, và phát hiện đúng khi giả mạo (đổi `vnp_Amount` sau khi ký → chữ ký
      sai). Vẫn nên **kiểm thử lại với sandbox VNPay thật** một lần trước khi
      lên production, vì test trên chỉ giả lập, không gọi server VNPay thật.
- [ ] **Giao hàng tự động thật**: `OrderItem.deliveredPayload` đã có sẵn
      trong schema nhưng chưa có UI/logic điền nội dung tài khoản/mã kích
      hoạt cho người mua sau khi thanh toán — hiện chỉ dừng ở trạng thái đơn
      hàng, chưa thực sự "giao hàng".
- [ ] **Review theo sản phẩm**: đánh giá seller (gian hàng) đã hiện thực thật
      (xem mục Backend), nhưng `Product.rating`/`reviewCount` trên từng thẻ
      sản phẩm vẫn là số tĩnh từ seed — nếu muốn review theo từng sản phẩm cụ
      thể thay vì theo cả gian hàng, cần thêm `productId` (optional) vào model
      `Review` hoặc tạo model riêng.
- [ ] Nâng cấp production: Postgres hiện chạy trên container Docker cục bộ
      (chỉ dùng cho dev) — cần chuyển sang dịch vụ Postgres có backup/HA thật
      khi triển khai (Supabase/Neon/RDS...), đổi `AUTH_SECRET` thật, xoá/đổi
      mật khẩu các tài khoản demo được tạo bởi `prisma/seed.ts`.
- [ ] Bổ sung thông tin pháp nhân/liên hệ thật của MarketMMO (thay thế phần
      "Thông tin công ty / thương hiệu tham khảo") — nội dung các trang pháp
      lý cũng chỉ mang tính tham khảo, cần luật sư rà soát trước khi dùng thật.
- [ ] Viết test tự động (unit/integration) cho logic nghiệp vụ (checkout, ví,
      escrow) — hiện chỉ mới kiểm thử thủ công bằng Playwright script trong
      lúc phát triển (không có trong repo, chỉ dùng để verify rồi xoá).
