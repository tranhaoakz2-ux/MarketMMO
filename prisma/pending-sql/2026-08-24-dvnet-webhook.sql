-- Tích hợp cổng nạp USDT DV.net (non-custodial, github.com/dv-net/dv-merchant)
-- — webhook POST /api/webhook/dvnet, tạo yêu cầu POST /api/wallet/deposit-dvnet.
-- KHÔNG cần cột mới (tái dùng WalletTransaction.method="dvnet"/gatewayRef/
-- depositCode/note có sẵn) — chỉ cần 1 UNIQUE INDEX để chặn 1 tx_id DV.net
-- được dùng cộng tiền quá 1 lần, kể cả khi 2 request webhook chạy song song
-- (race-condition) — CÙNG mẫu đã dùng cho usdt/sepay, xem
-- 2026-07-31-usdt-deposit-auto-verify.sql.
--
-- Idempotent — chạy lại an toàn nhờ IF NOT EXISTS. Không có dữ liệu cũ nào
-- dùng method="dvnet" (tính năng mới hoàn toàn) nên không cần bước kiểm tra
-- trùng trước như file usdt (không thể có trùng trên dữ liệu chưa từng tồn tại).
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_dvnet_deposit_txid_key"
ON "WalletTransaction" ("gatewayRef")
WHERE type = 'DEPOSIT' AND method = 'dvnet' AND "gatewayRef" IS NOT NULL;
