-- Việc 3 — Dùng quỹ bảo hiểm seller đền buyer khi khiếu nại SAU KHI đã giải
-- ngân (OrderItem.status=RELEASED, tiền đã vào ví seller, escrow không còn
-- để hoàn). Cần biết CHÍNH XÁC thời điểm giải ngân thật để tính cửa sổ bảo
-- hành sau giải ngân — escrowReleaseAt chỉ là ngày DỰ KIẾN lúc đặt đơn, sàn
-- chưa có cron tự động nên ngày giải ngân thật có thể lệch vài ngày.
--
-- Cột nullable, KHÔNG backfill dữ liệu cũ (đơn RELEASED trước đây không có
-- mốc chính xác — chấp nhận null, chỉ đơn RELEASED SAU khi thêm cột này mới
-- mở được khiếu nại bảo hành sau giải ngân). Idempotent — chạy lại an toàn.

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);
