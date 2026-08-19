-- Vá LAUNCH_AUDIT.md #1 — chặn "cướp" TxID nạp USDT TRC20 công khai trên
-- blockchain. Trước đây POST /api/wallet/deposit-usdt cộng tiền thẳng cho
-- BẤT KỲ ai gọi API kèm 1 TxID hợp lệ (đúng ví sàn, chưa dùng) — không có gì
-- ràng buộc TxID đó với đúng người đã gửi, vì TxID + số tiền + địa chỉ gửi
-- đều công khai trên Tronscan. Kẻ tấn công theo dõi ví sàn, thấy giao dịch
-- người khác vừa chuyển tới, copy TxID rồi tự submit trước bằng tài khoản
-- của mình để cướp khoản nạp.
--
-- Cách vá: buyer phải "đặt trước" 1 yêu cầu nạp (UsdtDepositIntent) TRƯỚC
-- khi chuyển — hệ thống cấp cho họ 1 SỐ USDT ĐỊNH DANH RIÊNG (phần nguyên
-- ≈ quy đổi từ VNĐ muốn nạp, 6 số thập phân cuối là mã ngẫu nhiên duy nhất
-- trong số các yêu cầu đang PENDING). Buyer chuyển ĐÚNG số đó. Lúc xác minh
-- on-chain (POST /api/wallet/deposit-usdt, không đổi tên route), hệ thống
-- khớp SỐ USDT THỰC NHẬN với đúng UsdtDepositIntent đang chờ — tiền luôn
-- cộng vào ví CHỦ YÊU CẦU (intent.userId), KHÔNG PHẢI người gọi API xác
-- minh. Ai cướp TxID gọi API bằng tài khoản khác cũng không được cộng gì,
-- vì tài khoản đó không có yêu cầu nào khớp đúng số tiền trên chain.
--
-- Không thêm ràng buộc UNIQUE cứng trên usdtAmountRaw (Postgres cần unique
-- index CÓ ĐIỀU KIỆN WHERE status='PENDING' mới đúng ý — dạng index này
-- Prisma schema DSL không biểu diễn được, và prisma db push có thể xoá mất
-- index không khai báo trong schema ở lần push sau) — thay vào đó code tự
-- kiểm tra trùng + retry với mã ngẫu nhiên khác trước khi tạo (đủ an toàn
-- vì không gian 6 số thập phân ~999.999 khả năng, chỉ cần không trùng với
-- các yêu cầu ĐANG PENDING cùng lúc).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, sau đó Claude mới sửa schema.prisma + chạy `prisma generate`
-- (KHÔNG `db push`/`migrate`). Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS "UsdtDepositIntent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Số VNĐ buyer yêu cầu nạp — ĐÓNG BĂNG tại thời điểm tạo yêu cầu, đây là
  -- số THỰC SỰ cộng vào ví khi khớp (không tính lại theo tỷ giá lúc xác
  -- minh TxID, tránh buyer bối rối vì lệch tỷ giá giữa 2 thời điểm).
  "vndAmount" INTEGER NOT NULL,
  -- Số USDT ĐỊNH DANH buyer phải chuyển, đơn vị raw (10^-6 USDT, khớp
  -- decimals thật của token USDT-TRC20) — vd 20483726 = 20.483726 USDT.
  "usdtAmountRaw" BIGINT NOT NULL,
  -- Tỷ giá + nguồn dùng để TÍNH GỢI Ý phần nguyên usdtAmountRaw lúc tạo yêu
  -- cầu — chỉ để hiển thị/đối chiếu, KHÔNG dùng lại lúc khớp (khớp thuần
  -- theo usdtAmountRaw).
  "rate" DOUBLE PRECISION NOT NULL,
  "rateSource" TEXT NOT NULL,
  -- "PENDING" (đang chờ buyer chuyển + xác minh) | "MATCHED" (đã khớp TxID,
  -- đã cộng ví) | "EXPIRED" (quá hạn, không dùng được nữa — set lười khi có
  -- request đọc/tạo mới đụng tới, không cần cron riêng).
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  -- TxID đã khớp vào yêu cầu này (nếu MATCHED) — audit/đối chiếu.
  "matchedTxid" TEXT,
  -- WalletTransaction được tạo khi khớp thành công — audit/đối chiếu.
  "matchedWalletTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "UsdtDepositIntent_userId_idx" ON "UsdtDepositIntent"("userId");
-- Index chính dùng lúc khớp TxID: tìm 1 intent PENDING có đúng usdtAmountRaw.
CREATE INDEX IF NOT EXISTS "UsdtDepositIntent_status_usdtAmountRaw_idx" ON "UsdtDepositIntent"("status", "usdtAmountRaw");
