-- Mã thành viên ngắn, dễ đọc cho MỌI User (buyer/seller) để admin tra cứu/
-- tìm kiếm — KHÁC User.id (cuid nội bộ, giữ nguyên không đổi). Dạng
-- "MMO000001", "MMO000002"... tăng dần theo thứ tự tạo tài khoản, CỐ ĐỊNH
-- vĩnh viễn sau khi gán (xem src/lib/member-code.ts).
--
-- Dự án dùng `prisma db push` (không migrations) — BẠN tự áp file này lên
-- Neon TRƯỚC, sau đó mới sửa schema.prisma + chạy `prisma generate`
-- (KHÔNG `db push`/`migrate` nhắm production). Idempotent — chạy lại an toàn.

-- 1) User: cột mã hiển thị — NULLABLE (tài khoản cũ chưa có cho tới khi chạy
--    script backfill), UNIQUE để không bao giờ trùng giữa 2 user.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_memberCode_key" ON "User"("memberCode");

-- 2) Bộ đếm tuần tự (singleton, 1 dòng cố định id="singleton") — tăng NGUYÊN
--    TỬ qua UPDATE...SET "nextNumber" = "nextNumber" + 1 (Postgres tự khoá
--    dòng, 2 request đăng ký cùng lúc tự tuần tự hoá, không cần transaction
--    đặc biệt). Không seed dữ liệu ở đây — script backfill
--    (scripts/backfill-member-codes.ts, KHÔNG tự chạy) sẽ khởi tạo đúng giá
--    trị = tổng số user hiện có + 1 khi bạn chạy tay.
CREATE TABLE IF NOT EXISTS "MemberCodeCounter" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nextNumber" INTEGER NOT NULL DEFAULT 1
);
