-- SECURITY_AUDIT #8 (chat theo đơn/khiếu nại — Cách B).
-- Thêm cột Message.disputeId (nullable) để tách luồng chat theo từng khiếu nại:
--   disputeId = NULL  -> tin nhắn CHUNG (ChatInbox thường)
--   disputeId = <id>  -> tin thuộc luồng trao đổi của đúng 1 Dispute
-- Cột THƯỜNG (không FK) để khi xoá Dispute không làm disputeId null (tránh tin
-- khiếu nại lọt vào chat chung). Index phục vụ lọc theo (conversationId, disputeId).
--
-- Dự án dùng `prisma db push` (không migrations). Đã áp cho DB DEV; file này để
-- BẠN TỰ áp lên DB PRODUCTION. Dạng IF NOT EXISTS -> chạy lại an toàn. Chỉ THÊM
-- cột + index, KHÔNG đụng dữ liệu (tin cũ mặc định NULL = chat chung).

-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "disputeId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_conversationId_disputeId_idx"
  ON "Message" ("conversationId", "disputeId");
