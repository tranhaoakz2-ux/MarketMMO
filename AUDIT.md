# AUDIT.md — Báo cáo rà soát kỹ thuật MarketMMO

> **CẬP NHẬT**: đã sửa M1, M2, L2 (xem "Trạng thái sau khi sửa" ngay dưới).
> L1 và L3 **cố ý giữ lại** (thay đổi lớn, động tới production — cần quyết
> định riêng). L4 là quy ước, không cần đổi code.
>
> Chạy các lệnh audit theo yêu cầu. Phân loại theo mức critical / high /
> medium / low.

---

## ✅ Trạng thái sau khi sửa (cập nhật)

| Mã | Mô tả ngắn | Trạng thái | Cách đã sửa |
|---|---|---|---|
| **M1** | postcss XSS (GHSA-qx2v-qp2m-jg93) | ✅ **ĐÃ SỬA** | Thêm `"overrides": { "postcss": "^8.5.10" }` vào `package.json` → postcss dedupe lên **8.5.20**, bản 8.4.31 do Next bundle biến mất. `npm audit` giờ **0 vulnerabilities**. |
| **M2** | next-auth beta dải version lỏng | ✅ **ĐÃ SỬA** | `package.json` → `"next-auth": "5.0.0-beta.31"` (bỏ caret, ghim cứng). |
| **L2** | tailwind `^4` quá lỏng | ✅ **ĐÃ SỬA** | `package.json` → `"tailwindcss": "~4.3.2"` + `"@tailwindcss/postcss": "~4.3.2"` (chỉ nhận patch). |
| **L4** | react-hooks v7 transitive | ✅ Không cần đổi code | Là quy ước "chạy `npm run lint` local trước khi push sau mỗi lần nâng Next". Hiện 0 vi phạm, deploy PASS. |
| **L1** | `db push`, không có migration | ⏸️ **GIỮ LẠI** | Chuyển sang Prisma Migrate = động tới **production Neon** + đổi workflow deploy. Rủi ro cao, cần quyết định + kế hoạch baseline riêng. Không sửa vội. |
| **L3** | Prisma 5.22 (v6 đã ra) | ⏸️ **GIỮ LẠI** | Nâng major (v5→v6) có breaking change, cần kiểm thử toàn bộ luồng DB. Không phải lỗ hổng — nâng có kế hoạch riêng. |

**Verify sau khi sửa (đã chạy lại):** `npm audit` = **0 vuln** · `tsc` = 0 lỗi ·
`npm run lint` = 0 lỗi · `npm run build` = **Compiled successfully** (54/54
trang) · CSS build ra đúng (69KB, có admin-shell + utility Tailwind) — override
postcss **không** phá vỡ build/CSS.

---

## Kết quả audit gốc (trước khi sửa)
>
> Môi trường: local Postgres qua Docker (cổng 5433). **Không** kết nối Neon
> production. Node 24, npm; Next 16.2.10, React 19.2.4, next-auth 5.0.0-beta.31,
> Tailwind 4, Prisma 5.22, ESLint 9.

---

## Tổng kết nhanh

| # | Lệnh | Kết quả | Mức cao nhất |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | ✅ **PASS** — 0 lỗi (exit 0) | — |
| 2 | `npm run lint` (eslint) | ✅ **PASS** — 0 lỗi/cảnh báo (exit 0) | — |
| 3a | `npx prisma validate` | ✅ **PASS** — schema hợp lệ (exit 0) | — |
| 3b | `npx prisma migrate status` | ⚠️ exit 1 — "not managed by Prisma Migrate" (kỳ vọng, do dùng `db push`) | Low |
| 4 | `npm audit` | ⚠️ **2 moderate** (postcss XSS, transitive qua Next) | Medium |

**Không có lỗi Critical hay High.** Build/deploy trên Vercel hiện **không bị
chặn** (tsc + lint đều xanh — xem chi tiết mục "Điểm quan trọng về
react-hooks v7" bên dưới).

| Mức | Số lượng | Mã |
|---|---|---|
| 🔴 Critical | 0 | — |
| 🟠 High | 0 | — |
| 🟡 Medium | 2 | M1, M2 |
| 🔵 Low | 4 | L1, L2, L3, L4 |

---

## 1. Type-check — `npx tsc --noEmit`

```
(không có output)
=== TSC EXIT: 0 ===
```

✅ **PASS** — 0 lỗi type. Không có finding.

---

## 2. Lint — `npm run lint` (giống Deployment Check trên Vercel)

```
> marketmmo@0.1.0 lint
> eslint
=== LINT EXIT: 0 ===
```

✅ **PASS** — 0 lỗi, 0 cảnh báo.

### ⭐ Điểm quan trọng về `eslint-plugin-react-hooks` v7 (theo yêu cầu soát riêng)

- Plugin đang dùng: **`eslint-plugin-react-hooks@7.1.1`**, nạp **transitive**
  qua `eslint-config-next@16.2.10` (KHÔNG phải direct dependency).
- Toàn bộ rule react-hooks v7 **đang bật ở mức `error` (2)** trong config đã
  resolve, gồm các rule mới của v7 vốn hay chặn build:
  `rules-of-hooks`, `static-components`, `set-state-in-effect`,
  `set-state-in-render`, `use-memo`, `preserve-manual-memoization`,
  `immutability`, `refs`, `purity`, `globals`, `error-boundaries`, `config`,
  `gating` = **error**; `exhaustive-deps`, `incompatible-library`,
  `unsupported-syntax` = **warn**.
- **Kết luận: hiện có 0 vi phạm** → **Deployment Check "Lint" trên Vercel sẽ
  PASS**, không chặn build.
- ⚠️ **Rủi ro tương lai (Low, xem L4)**: vì plugin là transitive và bị ghim
  qua `eslint-config-next@16.2.10` (phiên bản **cố định**, không caret), version
  react-hooks sẽ **không tự trôi**. Nhưng nếu nâng `next` / `eslint-config-next`
  lên bản mới hơn, react-hooks có thể lên phiên bản mới và **làm lộ lỗi hook
  mới → chặn deploy**. Cần chạy lại `npm run lint` sau mỗi lần nâng Next.

Không có finding cần sửa ở lệnh này.

---

## 3. Prisma

### 3a. `npx prisma validate` → ✅ PASS

```
The schema at prisma\schema.prisma is valid 🚀
validate exit: 0
```

### 3b. `npx prisma migrate status` → exit 1 (Finding **L1**)

```
Datasource "db": PostgreSQL database "marketmmo", schema "public" at "localhost:5433"
No migration found in prisma/migrations
The current database is not managed by Prisma Migrate.
migrate-status exit: 1
```

Xem finding **L1** bên dưới. Đây là **hành vi kỳ vọng** của dự án (dùng
`prisma db push`, không có thư mục `migrations/`), **không phải lỗi schema**.

---

## 4. Dependency audit — `npm audit`

```
postcss  <8.5.10  (moderate)
  PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
  GHSA-qx2v-qp2m-jg93
  node_modules/next/node_modules/postcss   (bản 8.4.31 do Next bundle)
next  9.3.4-canary.0 - 16.3.0-canary.5  (moderate, phụ thuộc postcss lỗi)
2 moderate severity vulnerabilities
fix "tự động": npm audit fix --force → HẠ next về 9.3.3 (BREAKING, KHÔNG dùng)
```

- Tổng: **2 moderate, 0 high, 0 critical**.
- `postcss` ở **root** = `8.5.16` (đã vá, an toàn). Bản dính lỗi là
  `8.4.31` **do Next 16 bundle riêng** trong `next/node_modules/postcss`.

Xem finding **M1**.

---

# Findings chi tiết

## 🟡 Medium

### M1 — postcss XSS (GHSA-qx2v-qp2m-jg93) qua postcss bundled của Next

| | |
|---|---|
| **File/vị trí** | `node_modules/next/node_modules/postcss@8.4.31` (transitive, do `next@16.2.10` bundle). Không phải dependency trực tiếp. |
| **Mức** | Medium (npm: moderate) |
| **Bản chất** | PostCSS < 8.5.10 có lỗi XSS khi **stringify** CSS chứa `</style>` không escape. Chỉ khai thác được nếu app **xử lý CSS không tin cậy (do người dùng nhập) qua PostCSS rồi render thẳng ra HTML**. |
| **Rủi ro thực tế** | **Thấp** với dự án này: PostCSS chỉ chạy ở **build-time** (biên dịch Tailwind), không xử lý CSS do end-user nhập vào lúc runtime. Không có bề mặt tấn công runtime. |
| **Cách sửa đề xuất** | **KHÔNG chạy `npm audit fix --force`** — nó hạ `next` về 9.3.3 (phá vỡ toàn bộ app). Đúng cách: (a) **chờ Next phát hành bản vá** bump postcss ≥ 8.5.10 rồi `npm i next@latest` (kiểm lại lint sau khi nâng — xem L4); hoặc (b) tạm ép resolution: thêm `"overrides": { "postcss": "^8.5.10" }` vào `package.json` rồi `npm i` — **cần test build kỹ** vì override postcss của Next có thể gây lệch. Khuyến nghị: chấp nhận rủi ro thấp, theo dõi bản Next mới, không can thiệp vội. |

### M2 — `next-auth` v5 BETA + dải version lỏng (`^5.0.0-beta.31`)

| | |
|---|---|
| **File/dòng** | `package.json:27` → `"next-auth": "^5.0.0-beta.31"` |
| **Mức** | Medium (rủi ro ổn định/chuỗi cung ứng, **không** phải CVE — npm audit không cờ) |
| **Bản chất** | Đang dùng **bản BETA** (`5.0.0-beta.31`) cho lớp xác thực — thành phần bảo mật cốt lõi. Caret `^` trên prerelease cho phép **tự nâng lên các beta mới hơn** (`beta.32`, `beta.33`...) khi có ai chạy `npm install`/`npm update`. Giữa các beta, next-auth v5 **thường xuyên có breaking change** (đổi API `auth()`, callback, cookie...). |
| **Rủi ro thực tế** | Trung bình. `package-lock.json` (có, 273KB) khoá version khi dùng `npm ci` → dev/CI ổn định. Nhưng `npm install` (không `ci`) hoặc thêm package mới có thể kéo beta mới → **có thể vỡ đăng nhập/session** bất ngờ. Beta cũng có thể còn lỗ hổng chưa biết. |
| **Cách sửa đề xuất** | **Ghim cứng version**: đổi `"^5.0.0-beta.31"` → `"5.0.0-beta.31"` (bỏ caret) trong `package.json:27`, chạy `npm i` để cập nhật lock. Khi nâng lên beta mới, làm **có chủ đích** (đọc changelog + test luồng đăng nhập/checkout). Theo dõi khi next-auth v5 ra **bản stable (5.0.0)** để chuyển sang. Luôn ưu tiên `npm ci` trong CI/CD thay vì `npm install`. |

---

## 🔵 Low

### L1 — `prisma migrate status` báo "not managed by Prisma Migrate" (exit 1)

| | |
|---|---|
| **File/vị trí** | Không có thư mục `prisma/migrations/`; workflow dùng `npm run db:push` (`package.json` script `db:push`). |
| **Mức** | Low (thông tin / rủi ro quy trình, **không** phải lỗi schema — `prisma validate` đã PASS) |
| **Bản chất** | Dự án cố ý dùng **`prisma db push`** (không tạo migration history). `migrate status` vì thế trả exit 1. Hệ quả: (a) **không có lịch sử migration** để audit thay đổi schema; (b) **rủi ro lệch schema** (drift) giữa dev local và Neon production nếu quên `db push` một bên — đã từng phải push tay 2 nơi khi thêm/xoá field; (c) bất kỳ pipeline CI nào gọi `prisma migrate status`/`migrate deploy` sẽ **fail**. |
| **Cách sửa đề xuất** | Không cần sửa ngay nếu chấp nhận workflow `db push` (phù hợp giai đoạn phát triển nhanh). **Trước khi lên production ổn định**, cân nhắc chuyển sang **Prisma Migrate**: `prisma migrate diff` để tạo migration baseline từ schema hiện tại, rồi dùng `migrate deploy` cho production. Trong lúc chưa chuyển: **đừng** đưa `migrate status`/`migrate deploy` vào CI; ghi rõ quy ước "mọi thay đổi schema phải `db push` cả dev lẫn Neon" (đã có trong CLAUDE.md). |

### L2 — `tailwindcss` / `@tailwindcss/postcss` dải version quá lỏng (`^4`)

| | |
|---|---|
| **File/dòng** | `package.json:41` → `"tailwindcss": "^4"`; `package.json:34` → `"@tailwindcss/postcss": "^4"` |
| **Mức** | Low |
| **Bản chất** | `^4` cho phép **bất kỳ** bản 4.x (4.0, 4.1, 4.9...). Tailwind v4 còn mới, các minor có thể đổi hành vi engine/`@theme`. Rủi ro UI lệch bất ngờ khi nâng. |
| **Cách sửa đề xuất** | Ghim chặt hơn theo minor đang chạy, ví dụ `"tailwindcss": "~4.x.y"` (thay `x.y` bằng version thực trong `package-lock.json`) để chỉ nhận patch. Không gấp — lockfile đã khoá cho `npm ci`. |

### L3 — Prisma 5.22 (đã có Prisma v6)

| | |
|---|---|
| **File/dòng** | `package.json:21,28` → `@prisma/client` / `prisma` = `^5.22.0` |
| **Mức** | Low (không có CVE — npm audit không cờ) |
| **Bản chất** | Đang ở nhánh **v5** trong khi Prisma **v6** đã phát hành. Không phải lỗ hổng, chỉ là đang tụt lại; càng để lâu nâng major càng khó. |
| **Cách sửa đề xuất** | Không gấp. Khi có thời gian, đọc changelog Prisma v6 (breaking chính: yêu cầu Node/TS tối thiểu, đổi vài default) rồi nâng có kiểm thử. Giữ nguyên nếu chưa cần. |

### L4 — `eslint-plugin-react-hooks` v7 là transitive → rủi ro chặn deploy khi nâng Next

| | |
|---|---|
| **File/vị trí** | Không khai báo trực tiếp; đến từ `eslint-config-next@16.2.10` (`package.json:39`, ghim cố định). Bản thực tế: `7.1.1`. |
| **Mức** | Low (hiện tại 0 lỗi, deploy PASS) |
| **Bản chất** | Vì react-hooks bị ghim gián tiếp qua `eslint-config-next@16.2.10` (không caret) nên **hiện tại ổn định, không trôi**. Nhưng nâng `next`/`eslint-config-next` lên bản mới có thể kéo react-hooks lên phiên bản mới với rule chặt hơn → **lộ lỗi hook mới → chặn Deployment Check "Lint" trên Vercel** (đúng loại sự cố đã từng gặp và phải vá 20 lỗi trước đây). |
| **Cách sửa đề xuất** | Không cần sửa bây giờ. **Quy ước**: sau MỖI lần nâng `next`/`eslint-config-next`, chạy `npm run lint` **ở local trước khi push** để bắt lỗi hook mới sớm, tránh để Vercel chặn build. (Tùy chọn) thêm `eslint-plugin-react-hooks` thành direct devDependency ghim cứng để kiểm soát version độc lập với Next. |

---

## Phụ lục — Trạng thái version thực tế

| Package | Khai báo (package.json) | Cài thực tế | Ghi chú |
|---|---|---|---|
| next | `16.2.10` (cố định) | 16.2.10 | bundle postcss 8.4.31 (M1) |
| react / react-dom | 19.2.4 | 19.2.4 | — |
| next-auth | `^5.0.0-beta.31` | 5.0.0-beta.31 | **BETA** (M2) |
| @auth/prisma-adapter | `^2.11.2` | 2.11.x | — |
| @prisma/client / prisma | `^5.22.0` | 5.22.0 | v6 đã ra (L3) |
| tailwindcss / @tailwindcss/postcss | `^4` | 4.x | dải lỏng (L2) |
| eslint | `^9` | 9.x | — |
| eslint-config-next | `16.2.10` (cố định) | 16.2.10 | kéo react-hooks 7.1.1 (L4) |
| eslint-plugin-react-hooks | (transitive) | **7.1.1** | 0 vi phạm hiện tại ✅ |
| postcss (root) | (transitive) | 8.5.16 | đã vá, an toàn |
| @vercel/blob | `^2.6.1` | 2.6.x | — |
| resend | `^6.17.2` | 6.17.x | — |
| bcryptjs | `^3.0.3` | 3.0.x | — |
| **package-lock.json** | — | có (273 KB) | dùng `npm ci` để khoá version |

## Kết luận

- **Không có lỗ hổng Critical/High.** Không có lỗi tsc/lint → **Vercel build
  hiện KHÔNG bị chặn**, kể cả với react-hooks v7 (mối lo chính) — 0 vi phạm.
- 2 finding Medium đều là **rủi ro chuỗi cung ứng/ổn định**, không phải lỗ
  hổng khai thác được runtime: postcss XSS (build-time, rủi ro thấp) và
  next-auth beta (nên ghim cứng version).
- 4 finding Low là dọn dẹp/phòng ngừa (migration strategy, ghim version,
  nâng cấp có kế hoạch).
- **Ưu tiên đề xuất khi bắt tay sửa**: M2 (ghim next-auth) → L4 (quy ước lint
  sau khi nâng Next) → L1 (chiến lược migration trước production) → M1/L2/L3
  (theo dõi, nâng có kế hoạch).
