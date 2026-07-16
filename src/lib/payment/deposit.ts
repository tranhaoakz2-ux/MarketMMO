// Cấu hình 2 kênh nạp tiền thủ công (thông tin nhận tiền phải là thật —
// KHÔNG tạo giá trị placeholder giả trông giống số tài khoản/địa chỉ ví thật,
// vì có thể khiến người dùng chuyển nhầm tiền thật vào nơi không xác định).
// Theo cùng quy ước env-var-gated như VNPay (xem src/lib/payment/vnpay.ts):
// thiếu key thì tính năng tự ẩn/disable, không chặn phần còn lại của app.

export type BankInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** Mã ngân hàng chuẩn Napas, dùng để tạo QR VietQR động (img.vietqr.io). */
  bin: string | null;
};

export function getBankInfo(): BankInfo | null {
  const bankName = process.env.BANK_NAME;
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
  const accountHolder = process.env.BANK_ACCOUNT_HOLDER;
  if (!bankName || !accountNumber || !accountHolder) return null;
  return { bankName, accountNumber, accountHolder, bin: process.env.BANK_BIN || null };
}

export type UsdtInfo = {
  address: string;
  /** Tỷ giá quy đổi VNĐ / 1 USDT, admin tự cập nhật trong .env theo thị trường. */
  rate: number;
};

export function getUsdtInfo(): UsdtInfo | null {
  const address = process.env.USDT_TRC20_ADDRESS;
  const rate = Number(process.env.USDT_VND_RATE);
  if (!address || !Number.isFinite(rate) || rate <= 0) return null;
  return { address, rate };
}
