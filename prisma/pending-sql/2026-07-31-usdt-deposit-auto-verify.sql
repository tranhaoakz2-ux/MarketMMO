-- Phần 2 — Tự động hoá nạp USDT (TRC20) cho buyer, xác minh on-chain qua
-- TronGrid. KHÔNG cần cột mới (tái dùng WalletTransaction.gatewayRef/method/
-- note/amount có sẵn) — chỉ cần 1 UNIQUE INDEX để chặn 1 TxID được dùng để
-- cộng tiền quá 1 lần, kể cả khi 2 request chạy song song (race-condition).
--
-- ============================================================
-- BƯỚC 1 — BẮT BUỘC chạy trước, CHỈ ĐỌC: kiểm tra có TxID nào đã bị trùng
-- trong dữ liệu cũ hay không (luồng thủ công trước đây KHÔNG có ràng buộc
-- unique nên về lý thuyết có thể đã tồn tại trùng — không chắc chắn với dữ
-- liệu Neon production, đã kiểm tra dev local thì sạch).
-- ============================================================
SELECT "gatewayRef", count(*)
FROM "WalletTransaction"
WHERE type = 'DEPOSIT' AND method = 'usdt' AND "gatewayRef" IS NOT NULL
GROUP BY "gatewayRef"
HAVING count(*) > 1;

-- Nếu BƯỚC 1 trả về 0 dòng: chạy tiếp BƯỚC 2 bên dưới.
-- Nếu BƯỚC 1 trả về CÓ dòng: DỪNG LẠI, báo lại cho tôi kèm kết quả — cần xử
-- lý dữ liệu trùng đó trước (rất có thể là dấu hiệu đã có người nạp trùng
-- TxID trong quá khứ, cần rà lại thủ công) rồi mới tạo được unique index.

-- ============================================================
-- BƯỚC 2 — Tạo unique index (idempotent, chạy lại an toàn nhờ IF NOT EXISTS)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_usdt_deposit_txid_key"
ON "WalletTransaction" ("gatewayRef")
WHERE type = 'DEPOSIT' AND method = 'usdt' AND "gatewayRef" IS NOT NULL;
