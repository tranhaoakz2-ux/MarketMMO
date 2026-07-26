-- Quên mật khẩu: chuyển từ link-token sang mã OTP 6 số gửi qua email.
-- PasswordResetToken: đổi cột tokenHash -> codeHash (lưu SHA-256 hash của mã
-- 6 số thay vì token 32 byte ngẫu nhiên), BỎ ràng buộc UNIQUE trên cột này
-- (mã 6 số chỉ có 1 triệu khả năng — một ràng buộc unique toàn cục sẽ va
-- chạm thật giữa nhiều user khác nhau, khác hẳn token cũ 256-bit; tra cứu
-- giờ luôn scope theo userId, tìm bằng email trước), thêm cột attempts (đếm
-- số lần nhập sai để khoá sau N lần, buộc xin mã mới) + index theo userId.
--
-- Dự án dùng `prisma db push` (không migrations). Đã áp cho DB DEV; file này
-- để BẠN TỰ áp lên DB PRODUCTION. Idempotent — chạy lại an toàn. Token cũ
-- (nếu còn tồn tại trong DB) sẽ không còn dùng được sau khi đổi logic đọc
-- sang mã 6 số — không ảnh hưởng vì token cũ vốn đã hết hạn/dùng 1 lần.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PasswordResetToken' AND column_name = 'tokenHash'
  ) THEN
    ALTER TABLE "PasswordResetToken" RENAME COLUMN "tokenHash" TO "codeHash";
  END IF;
END $$;

-- Bỏ ràng buộc UNIQUE cũ (tên constraint mặc định Prisma sinh ra từ trước)
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_tokenHash_key";

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId");
