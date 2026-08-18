# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo **MarketMMO**.

> **Đọc cùng lúc**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — mô tả
> chi tiết CÁCH TỪNG HỆ THỐNG NGHIỆP VỤ VẬN HÀNH THẬT (checkout/escrow, 4
> loại sản phẩm, lộ hàng, bảo hành, giải ngân/cron, đặt trước, khiếu nại,
> rút tiền, đấu giá, nạp tiền, phí sàn/hoa hồng, admin, SEO...). File
> `CLAUDE.md` này chỉ nói về stack/cấu trúc/quy ước/quy trình làm việc —
> **không lặp lại** nội dung nghiệp vụ đã có ở đó.

## Tổng quan dự án

MarketMMO là **marketplace multi-vendor** bán tài khoản số (Gmail, Facebook,
Discord, TikTok...), vật phẩm/tiền tệ game MMO, dịch vụ boosting, và công
cụ/Tool AI Agent. Người dùng cuối là người Việt Nam → giao diện/nội dung
tiếng Việt, tiền tệ VNĐ. Cơ chế cốt lõi: **ký quỹ (escrow)** giữ tiền buyer
tới khi hết bảo hành/hết hạn ký quỹ mới giải ngân cho seller, giao hàng số tự
động 24/7. Tham khảo mô hình kinh doanh từ shopmini.pro (không phải thông tin
pháp lý chính thức — xem `docs/ARCHITECTURE.md` để biết logic thật đã xây).

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript — `src/` + alias
  `@/*`. Route Handlers (`app/api/**/route.ts`) cho toàn bộ backend, không
  dùng Server Actions.
- **Styling**: Tailwind CSS v4 (`@theme inline` trong `src/app/globals.css`,
  không có `tailwind.config.js` riêng). Icon: `lucide-react` (không có logo
  thương hiệu — SVG inline riêng cho Facebook/TikTok/Zalo, xem `Footer.tsx`).
  Animation: `framer-motion` qua component `Reveal` dùng chung cho scroll-in.
- **DB**: Prisma ORM 5 + **PostgreSQL 16**. Dev local qua Docker
  (`docker-compose.yml`, container `market-mmo-postgres-1`, **cổng host
  5433** — không phải 5432 mặc định, tránh đụng stack Docker khác trên máy
  dev). Production: **Neon** (managed Postgres, khác hẳn Docker local —
  xem mục "Quy trình đổi schema" bên dưới, đây là điểm dễ nhầm nhất).
  Trạng thái/loại (`status`, `type`...) là cột `String` tự do, KHÔNG dùng
  enum Postgres — union type tương ứng khai ở `src/lib/constants.ts`.
- **Auth**: Auth.js (`next-auth@5` beta) — Credentials (email/username +
  password, bcrypt) + Google OAuth (env-gated) + Turnstile chống bot
  (env-gated, fail-closed ở production). Session JWT, refresh
  role/walletBalance/banned từ DB mỗi request. Chi tiết: `docs/ARCHITECTURE.md` §1.
- **Thanh toán**: VNPay (chờ key thật), SePay webhook (chờ key thật, tự
  động hoá nạp bank), USDT TRC20 (xác minh on-chain thật qua TronGrid, hoạt
  động ngay khi có địa chỉ ví), bank thủ công. Admin cấu hình qua
  `/admin/cai-dat` (model `PaymentConfig`, ưu tiên hơn `.env`). Chi tiết:
  `docs/ARCHITECTURE.md` §11.
- **Mã hoá dữ liệu nhạy cảm**: AES-256-GCM (`src/lib/service-crypto.ts`,
  Node `crypto` built-in) cho field dịch vụ nhạy cảm và kho credential TOOL
  — bắt buộc `SERVICE_CREDENTIAL_ENCRYPTION_KEY`, fail-closed nếu thiếu.
- **Cron**: Vercel Cron (`vercel.json`) — `POST /api/cron/daily`, 1
  lần/ngày (16:00 UTC = 23:00 VN), bảo vệ bằng `CRON_SECRET`. Xem
  `docs/ARCHITECTURE.md` §6 để biết việc gì ĐÃ tự động và việc gì CHƯA.

### Lệnh thường dùng

```bash
docker compose up -d   # khởi động PostgreSQL cho dự án (bắt buộc trước khi dev)
npm run dev             # dev server tại http://localhost:3000
npm run build            # build production
npm run lint              # eslint
npx tsc --noEmit           # typecheck
npm run db:push        # đồng bộ schema.prisma → DB (AN TOÀN dùng local — .env trỏ Docker, KHÔNG phải Neon)
npm run db:seed         # nạp lại dữ liệu mẫu
npm run db:studio        # Prisma Studio
npm run screenshot -- <url> <outPath> [width] [height] [fullPage]  # Playwright, đối chiếu design
```

Lần đầu clone: copy `.env.example` → `.env`, `docker compose up -d`, rồi
`npm run db:push && npm run db:seed`.

**Project skill**: `.claude/skills/start-dev/SKILL.md` — quy trình chuẩn bật
Postgres + dev server + gotcha đã gặp (EPERM khi generate Prisma lúc dev
server đang chạy, sai cổng DATABASE_URL...). Dùng skill này thay vì dò lại.

## Cấu trúc thư mục chính

```
docker-compose.yml       # Postgres riêng cho dự án (cổng host 5433)
vercel.json               # cấu hình cron (POST /api/cron/daily)
prisma/
  schema.prisma            # toàn bộ model — nguồn chân lý duy nhất về DB
  seed.ts                    # nạp category/product/seller/admin/buyer demo
  pending-sql/                # SQL đã/cần chạy tay trên Neon — xem quy trình bên dưới
                                # + docs/ARCHITECTURE.md §16 (lịch sử đầy đủ)
src/
  auth.ts                    # cấu hình Auth.js
  middleware.ts               # gắn X-Robots-Tag noindex khi host khác domain chuẩn
  app/
    page.tsx, danh-muc/, san-pham/, shop/, nguoi-ban/, tim-kiem/, dau-gia/,
    dien-dan/, lay-2fa/, cau-hoi-thuong-gap/, dieu-khoan-*, chinh-sach-bao-mat/,
    sitemap-trang-web/, tai-lieu-api/       # trang công khai (Server Components)
    dang-nhap/, quen-mat-khau/, gio-hang/, don-hang/, nap-tien/, tin-nhan/,
    ho-so-ca-nhan/, tro-thanh-nguoi-ban/     # trang cần đăng nhập (metadata noindex)
    trang-ban-hang/           # (SELLER/ADMIN) dashboard người bán đầy đủ — xem
                                # layout.tsx (guard) + từng trang con (san-pham,
                                # don-san-pham, don-dich-vu, rut-tien, quy-bao-hiem,
                                # danh-gia, dat-truoc, ma-giam-gia, khieu-nai,
                                # telegram-bot, quang-ba, ho-so). Các thư mục
                                # `demo-*` là bản demo tĩnh dùng để duyệt thiết kế
                                # trước khi xây thật (KHÔNG phải trang thật).
    admin/                     # Admin Control Center — shell riêng (theme tối
                                # `.admin-shell`, KHÔNG dùng Header/Footer site
                                # mua sắm). 18 trang con — xem
                                # docs/ARCHITECTURE.md §14 để biết đủ danh sách +
                                # route API đứng sau từng mục.
    api/                        # toàn bộ backend — xem docs/ARCHITECTURE.md để
                                  # biết route nào làm gì (không liệt kê lại ở đây,
                                  # danh sách quá lớn và đổi thường xuyên)
    robots.ts, sitemap.ts      # SEO — xem docs/ARCHITECTURE.md §15
    globals.css                # design tokens Tailwind v4 (`@theme inline`) +
                                  # theme tối riêng cho admin (biến `--adm-*`)
  components/                  # 1 component/file, PascalCase trùng tên file.
                                # admin/ = component riêng Admin Control Center
                                # (dùng token --adm-*). admin-demo/ = bộ UI-kit
                                # AdminDemoKit dùng chung giữa bản demo & trang
                                # thật (Card/Button/StatusBadge/DataTable...).
                                # seller-demo/ = tương tự cho demo trang seller.
  context/CartContext.tsx      # giỏ hàng client — snapshot sản phẩm, localStorage
  data/                        # nguồn seed (categories.ts, products.ts) — KHÔNG
                                # import trực tiếp trong trang, chỉ dùng bởi seed.ts
  lib/                         # toàn bộ logic nghiệp vụ dùng chung — xem
                                # docs/ARCHITECTURE.md để biết hàm nào làm gì.
                                # File đáng chú ý: queries.ts (mọi fetch Prisma
                                # cho trang công khai — mapProduct() KHÔNG BAO GIỜ
                                # đưa field nhạy cảm ra ngoài), authz.ts (require*),
                                # warranty.ts, escrow.ts, auction.ts,
                                # commission.ts, platform-fee.ts, service-crypto.ts,
                                # constants.ts (mọi hằng số + union type trạng thái)
scripts/
  screenshot.mjs               # Playwright cho `npm run screenshot`
docs/
  ARCHITECTURE.md               # tài liệu vận hành đầy đủ — ĐỌC TRƯỚC KHI SỬA
                                  # logic nghiệp vụ bất kỳ hệ thống nào
```

Trang danh mục/sản phẩm/shop/trang chủ đều `export const dynamic =
"force-dynamic"` (tồn kho/đã bán/số dư ví đổi liên tục) — không SSG.

## Quy trình làm việc quan trọng

**1. Đổi schema Prisma — BẮT BUỘC theo đúng thứ tự này:**
1. Viết file SQL mới vào `prisma/pending-sql/YYYY-MM-DD-mo-ta-ngan.sql`
   (idempotent — `ADD COLUMN IF NOT EXISTS`...), kèm comment giải thích lý
   do/tác động migration-safety cho dữ liệu cũ.
2. **DỪNG, đưa user duyệt** — KHÔNG tự chạy SQL này lên Neon (production).
3. Sau khi user xác nhận đã chạy trên Neon: cập nhật `prisma/schema.prisma`
   khớp đúng SQL, chạy `npx prisma generate` (KHÔNG `prisma db push`/
   `migrate` nhắm production).
4. Muốn test local: `npm run db:push` **AN TOÀN** để chạy — `.env` local trỏ
   Docker (cổng 5433), hoàn toàn tách biệt với Neon. Đây là bước RIÊNG,
   không thay thế bước 2-3.
5. Thêm 1 dòng vào bảng lịch sử ở `docs/ARCHITECTURE.md` §16.
6. Trên Windows: **dừng dev server trước** khi chạy `prisma generate`/
   `db push` — engine `.dll.node` bị khoá file nếu dev server đang chạy
   (lỗi `EPERM`).

**2. Không tự ý commit/push.** Sau khi hoàn thành + tự test xong, báo cáo
kết quả và DỪNG LẠI chờ user xem/duyệt. Chỉ commit/push khi user gõ yêu cầu
rõ ràng (vd "hãy commit + push"). Không amend, không `--no-verify`, không
force-push trừ khi được yêu cầu tường minh.

**3. Script test tạm thời**: viết vào `scripts/tmp-*.mjs`, chạy bằng `node
scripts/tmp-xxx.mjs`, **xoá file sau khi dùng xong** — không để lại script
test một lần trong repo. Kỹ thuật hay dùng để test qua HTTP thật (không phải
gọi thẳng Prisma) khi cần né Turnstile: mint session cookie bằng
`next-auth/jwt`'s `encode()` cho tài khoản seller/buyer/admin demo, gọi
thẳng route API.

**4. Trước khi sửa 1 hệ thống nghiệp vụ**: đọc đúng mục liên quan trong
`docs/ARCHITECTURE.md` trước — đừng suy đoán lại từ tên biến/route, nhiều
cơ chế (đấu giá, pre-order, bảo hành) đã qua rebuild lớn và khác đáng kể so
với thiết kế ban đầu.

**5. `git status` trước mọi lệnh có thể mất dữ liệu** (`checkout`/`restore`/
`reset`/`clean`) — stash trước nếu có thay đổi chưa commit.

## Nguyên tắc bảo mật cốt lõi

- **Nội dung giao hàng CHỈ lộ qua `reveal-delivered`** (`POST
/api/orders/[orderItemId]/reveal-delivered`) — buyer phải đã mua + tự bấm
  "Xem". `mapProduct()`/mọi query công khai (`src/lib/queries.ts`) TUYỆT ĐỐI
  không được đưa `tutTrickContent`, `toolUsageGuide`, `toolDeliveryLink`,
  `deliveredPayload` ra ngoài. Xem `docs/ARCHITECTURE.md` §4.
- **Field nhạy cảm mã hoá at-rest, fail-closed**: `ServiceIntake` (secret
  field dịch vụ) và `ProductStockItem.content` (kho TOOL) qua
  `src/lib/service-crypto.ts` (AES-256-GCM). Thiếu
  `SERVICE_CREDENTIAL_ENCRYPTION_KEY` → chặn cứng, KHÔNG BAO GIỜ lưu
  plaintext dự phòng. Không log plaintext/ciphertext ở bất kỳ đâu.
- **Mọi thao tác đổi tiền/tồn kho** bọc trong `prisma.$transaction`, bước
  "trừ có điều kiện" dùng `updateMany({where:{..., đủ điều kiện}})` rồi
  kiểm `count===0` để phát hiện race condition (2 request song song tranh
  cùng 1 tài nguyên) — xem ví dụ chuẩn ở `POST /api/checkout`.
- **API route luôn qua `requireUser()`/`requireSeller()`/`requireAdmin()`**
  (`src/lib/authz.ts`) — không tự viết lại check session/role/banned/
  suspended.
- **File upload**: luôn verify magic-byte thật (`assertMagicMatches()` trong
  `src/lib/uploads.ts`), không tin `Content-Type` client gửi. Không cho
  upload định dạng thực thi trần (chỉ .zip nếu cần nén) — bài học từ việc
  đã CHỦ ĐỘNG GỠ tính năng upload file .zip lên sàn cho Tool/AI Agent
  (2026-08-18) vì rủi ro phát tán mã độc, chỉ giữ lại "link tải ngoài".
- **Không hardcode key/secret mẫu "trông giống thật"** trong `.env.example`
  — để trống buộc người triển khai điền giá trị thật, tránh chuyển nhầm
  tiền vào địa chỉ/tài khoản không xác định.

## Design System (tóm tắt — chi tiết đo pixel xem lịch sử git nếu cần)

- **Container**: `mx-auto max-w-7xl` toàn site — biến `--container-7xl:
92rem` (đã +15% so với mặc định Tailwind) khai trong `@theme inline` của
  `globals.css`. Đổi bề rộng site: chỉ sửa biến này, không thêm
  `max-w-[...]` rải rác.
- **Màu chủ đạo**: xanh chuối non — `--color-brand` (#8DC63F nền chính) /
  `--color-brand-dark` (#6FA82E, hover/text nhấn) / `--color-brand-light`
  (#D4EDA6, overlay nhạt). Nền tối `#111111`–`#1A1A2E` cho header trên
  cùng/footer. Dùng qua utility `bg-brand`/`text-brand`/`border-brand`(-dark/
  -light) — không hardcode hex mới.
- **Header 3 lớp** (đo pixel-chính-xác từ shopmini.pro): ticker tối ~22px →
  thanh chính nền brand cao 56px (logo + "MARKETMMO", nút Đăng nhập nền đen
  trước/Đăng ký nền trắng sau) → nav trắng cao 50px, chữ 16px font-semibold,
  dropdown mega-menu hover (`NavMegaMenu.tsx`) cho Sản phẩm/Dịch vụ/Nạp tiền.
- **Marquee carousel** (`FeaturedCarousel`/`SellerCarousel`): track nhân đôi
  `[...items, ...items]`, chạy `0% → -50%`, dừng khi hover. Danh sách ngắn
  phải lặp thành 1 "block" đủ rộng khung nhìn TRƯỚC khi nhân đôi (tránh hở
  khoảng trắng cuối chu kỳ) — xem `SellerCarousel.tsx` nếu thêm marquee mới.
- **Logo**: `public/logo-mark.png` (icon) + `public/logo-full.png` (đầy đủ)
  — thay logo mới chỉ cần đè 2 file này, giữ nguyên tên.

## Quy tắc bắt buộc (mọi thay đổi UI)

1. **Screenshot đối chiếu**: sau thay đổi UI lớn, `npm run dev` rồi `npm run
screenshot` để chụp lại, so với thiết kế gốc trước khi coi là hoàn thành.
2. **Mobile-friendly**: kiểm tra responsive trước khi báo hoàn thành.
3. **Scroll animation**: mọi section cấp trang bọc trong `<Reveal>` — không
   tự viết animation riêng.

## Quy ước code

- TypeScript strict; component UI tách khỏi logic dữ liệu (`src/lib/queries.ts`
  cho mọi fetch Prisma — không import `src/data/*.ts` trong trang).
- 1 component/file, PascalCase trùng tên file, đặt tại `src/components/`.
- Màu qua CSS variable/utility đã khai trong `globals.css` — không hardcode
  hex mới trừ khi thật sự cần.
- Không thêm thư viện/abstraction ngoài phạm vi cần thiết cho từng tính năng.
- **Prisma `orderBy` field nullable + DESC**: Postgres mặc định xếp `NULL`
  LÊN ĐẦU khi `ORDER BY x DESC` — muốn ưu tiên record có giá trị, phải
  `orderBy: { field: { sort: "desc", nulls: "last" } }` tường minh (bug thật
  đã gặp ở `getFeaturedProducts`).
- **State tính theo thời gian thật** (đếm ngược, timestamp): không tính
  ngay ở lần render đầu (`useState(() => ...)`) vì server/client tính ở 2
  mili-giây khác nhau → hydration mismatch. Khởi tạo `null`, tính thật trong
  `useEffect`.

## Tài khoản demo (`npm run db:seed`)

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@marketmmo.pro` | `Admin@123456` (hoặc theo `.env` `ADMIN_PASSWORD`) |
| Buyer | `buyer@marketmmo.pro` | `Buyer@123` |
| Seller | `marketmmo-store@marketmmo.pro` (+ `accverse@`, `proaccounts@`, `cloudhouse@marketmmo.pro`) | `Seller@123` |

> Đổi/xoá các tài khoản này trước khi triển khai production thật.

## Trạng thái hiện tại — còn thiếu / cần lưu ý

- **VNPay & SePay webhook**: khung code đầy đủ, đã rà lỗi kỹ, nhưng **chưa
  hoạt động thật** — thiếu key/secret thật trong `.env`/`PaymentConfig`.
  USDT TRC20 sẵn sàng hoạt động ngay khi có địa chỉ ví thật (không phụ
  thuộc secret bên thứ 3).
- **Chưa có cron cho**: hoàn tiền pre-order quá hạn (chỉ nút admin bấm tay,
  `POST /api/admin/preorders/refund-overdue`) và escalate khiếu nại
  `SELLER_WARRANTY→PLATFORM` sau 24h (buyer phải tự bấm nút). Giải ngân
  escrow + chốt phiên đấu giá ĐÃ có cron (`/api/cron/daily`, 1 lần/ngày).
- **Sản phẩm bị REJECTED** không có luồng "sửa rồi gửi lại" — seller phải
  đăng sản phẩm mới, bản ghi cũ giữ nguyên làm lịch sử.
- **Sửa phiên bản (variant)**: API `PATCH` đã có nhưng UI mới hỗ trợ thêm/
  xoá, chưa có form sửa inline.
- **Test tự động**: chưa có unit/integration test trong repo — kiểm thử thủ
  công qua script HTTP tạm thời (mint JWT session) trong lúc phát triển, xoá
  sau khi verify xong (xem "Quy trình làm việc" mục 3).
- Xem `docs/ARCHITECTURE.md` từng mục để biết chi tiết đầy đủ hơn về phần
  nào đã hoàn thiện/còn dở dang trong mỗi hệ thống.
