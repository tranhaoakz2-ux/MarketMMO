-- Làm lại luồng nạp tiền ngân hàng (/nap-tien) theo wizard 3 bước: chọn
-- phương thức -> nhập số tiền + xác nhận -> server tạo WalletTransaction rồi
-- mới hiện QR/mã. Cần 2 cột mới trên WalletTransaction (tiếp tục dùng bảng
-- này làm "Deposit record" — KHÔNG tạo bảng Deposit riêng, tránh phải viết
-- lại webhook SePay/admin duyệt tay đang hoạt động, cả 2 đều key theo
-- WalletTransaction type="DEPOSIT").
--
-- depositCode: mã nội dung chuyển khoản, sinh Ở SERVER (không tin client),
-- UNIQUE thật trong DB — trước đây mã chỉ nằm trong chuỗi tự do "note", có
-- unique index CÓ ĐIỀU KIỆN (WHERE NOT NULL) vì các dòng WalletTransaction
-- khác (PURCHASE/PAYOUT/WITHDRAW...) không có mã này.
-- expiresAt: hạn hiệu lực của yêu cầu nạp (buyer thấy đếm ngược ở UI) — webhook
-- SePay vẫn cộng tiền dù quá hạn (an toàn cho khách), chỉ ghi thêm log cho
-- admin biết đã khớp trễ hạn.
--
-- Dự án dùng `prisma db push` (không migrations). File này để BẠN TỰ áp lên
-- Neon (production) — TÔI KHÔNG tự chạy. Idempotent — chạy lại an toàn. Cột
-- mới nullable, không đụng dữ liệu cũ.

ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "depositCode" TEXT;
ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_depositCode_key"
ON "WalletTransaction" ("depositCode")
WHERE "depositCode" IS NOT NULL;
