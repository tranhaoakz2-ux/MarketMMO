---
name: start-dev
description: Launch and drive the MarketMMO local dev environment (PostgreSQL via Docker + Next.js dev server) so the app can be previewed, screenshotted, or tested in a browser. Use whenever asked to run/start/preview/open the website, view a change working, or test a feature end-to-end. Covers this repo's exact setup — port 5433 (not default 5432), Windows file-lock gotcha with Prisma, and the seeded demo accounts.
---

# Chạy MarketMMO ở local

## 1. Khởi động PostgreSQL (Docker)

```bash
docker compose up -d
```

Container: `market-mmo-postgres-1`, cổng host **5433** (không phải 5432 mặc
định — máy này còn một stack Docker khác của dự án riêng biệt
`D:\Du-an-MMO` chiếm cổng 5432, **không đụng vào** container đó).

Đợi sẵn sàng trước khi chạy app:

```bash
until docker exec market-mmo-postgres-1 pg_isready -U marketmmo >/dev/null 2>&1; do sleep 1; done
```

Container có `restart: unless-stopped` nên thường đã chạy sẵn — luôn `docker
compose up -d` trước để chắc chắn, lệnh này an toàn khi container đã chạy rồi
(no-op).

## 2. Khởi động dev server

```bash
cd "d:/Market-mmo" && (npm run dev > /tmp/dev-server.log 2>&1 &) ; sleep 1
```

Đợi cổng sẵn sàng (không dùng `sleep` cố định):

```bash
timeout 40 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Nếu port 3000 đã bị chiếm bởi phiên chạy trước, dừng trước khi chạy lại:

```bash
netstat -ano | grep ':3000' | grep LISTENING   # lấy PID cột cuối
taskkill //PID <pid> //F
```

## 3. Xác nhận app chạy thật (không chỉ launch suông)

Cách nhanh nhất — chụp trang chủ bằng script Playwright sẵn có của repo:

```bash
npm run screenshot -- http://localhost:3000/ "<đường dẫn ảnh>.png" 1280 900 true
```

Đọc lại ảnh bằng Read tool để xem trực quan. Script này tự cuộn qua trang
trước khi chụp để các section có scroll-animation (`Reveal`) đã hiện đầy đủ.

Muốn test một luồng cụ thể (đăng nhập, mua hàng, admin duyệt...), viết một
script Playwright tạm trong `scripts/` (vd `scripts/test-xxx.mjs`), chạy bằng
`node scripts/test-xxx.mjs`, rồi **xoá file đó sau khi xong** — đây là quy
ước đã dùng xuyên suốt dự án, không để lại script test một lần trong repo.

## 4. Tài khoản demo (từ `npm run db:seed`)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin (trang `/admin`) | `admin@marketmmo.pro` | `Admin@123456` |
| Buyer (ví sẵn 500.000đ) | `buyer@marketmmo.pro` | `Buyer@123` |
| Seller (vd MarketMMO Store) | `marketmmo-store@marketmmo.pro` | `Seller@123` |

Seller khác: `accverse@`, `proaccounts@`, `cloudhouse@marketmmo.pro`, cùng
mật khẩu `Seller@123`.

## 5. Dừng lại khi xong việc

```bash
netstat -ano | grep ':3000' | grep LISTENING
taskkill //PID <pid> //F
```

Postgres có thể để chạy nền (không cần `docker compose down` mỗi lần) — chỉ
tắt dev server Next.js là đủ để dọn dẹp.

## Gotcha đã gặp — đọc trước khi debug lại từ đầu

- **`npx prisma generate` / `db push` báo `EPERM ... query_engine-windows.dll.node`**:
  do dev server đang chạy giữ khoá file engine trên Windows. Luôn **dừng dev
  server trước** khi đổi `prisma/schema.prisma` rồi generate/push lại.
- **`DATABASE_URL` sai cổng**: phải là
  `postgresql://marketmmo:marketmmo@localhost:5433/marketmmo` (5433, không
  phải 5432) — xem `.env`.
- **Trang trống/lỗi kết nối khi mở trình duyệt**: 90% là do quên bật lại dev
  server sau khi Claude tắt nó ở cuối phiên trước — server **không** tự chạy
  nền giữa các lần hội thoại, phải `npm run dev` lại mỗi lần.
