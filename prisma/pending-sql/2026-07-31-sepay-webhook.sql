-- Phần 3 — Tự động hoá nạp VNĐ qua SePay (webhook đọc biến động số dư ngân
-- hàng). Tái dùng WalletTransaction có sẵn cho luồng KHỚP ĐƯỢC mã đơn (chỉ
-- cần 1 unique index chống trùng ID giao dịch SePay, giống hệt Phần 2) +
-- thêm 1 bảng nhỏ cho luồng KHÔNG khớp được (không có userId để gắn vào
-- WalletTransaction, cần bảng riêng cho admin xử lý tay).
--
-- ============================================================
-- 1) Unique index chống cộng trùng 1 giao dịch SePay 2 lần (kể cả khi SePay
--    tự động thử lại webhook nhiều lần — tối đa 7 lần trong 5 giờ theo tài
--    liệu). Idempotent.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_sepay_deposit_txid_key"
ON "WalletTransaction" ("gatewayRef")
WHERE type = 'DEPOSIT' AND method = 'sepay' AND "gatewayRef" IS NOT NULL;

-- ============================================================
-- 2) Giao dịch SePay báo về nhưng KHÔNG khớp được mã đơn nào đang chờ (buyer
--    quên ghi mã / gõ sai / chuyển không qua form nạp tiền) — lưu lại để
--    admin tự đối chiếu và gán cho đúng buyer. "sepayId" UNIQUE đóng vai trò
--    chống trùng cho NHÁNH này (khác nhánh khớp được ở trên, dùng
--    WalletTransaction.gatewayRef) — 2 lớp UNIQUE riêng biệt che phủ đủ cả
--    2 khả năng xử lý của 1 giao dịch SePay.
-- ============================================================
CREATE TABLE IF NOT EXISTS "SepayUnmatchedTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sepayId" TEXT NOT NULL UNIQUE,
  "gateway" TEXT,
  "amount" INTEGER NOT NULL,
  "content" TEXT,
  "referenceCode" TEXT,
  "transactionDate" TIMESTAMP(3),
  -- UNMATCHED (mới về, chưa xử lý) | RESOLVED (admin đã gán cho 1 user) |
  -- IGNORED (admin xác nhận không phải tiền nạp, bỏ qua).
  "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "resolvedWalletTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);
