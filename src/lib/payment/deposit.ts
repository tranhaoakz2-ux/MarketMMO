// Cấu hình 2 kênh nạp tiền thủ công (thông tin nhận tiền phải là thật —
// KHÔNG tạo giá trị placeholder giả trông giống số tài khoản/địa chỉ ví thật,
// vì có thể khiến người dùng chuyển nhầm tiền thật vào nơi không xác định).
// Quản lý qua /admin/cai-dat (bảng PaymentConfig), fallback .env
// (BANK_NAME/BANK_ACCOUNT_NUMBER/... , USDT_TRC20_ADDRESS/USDT_VND_RATE) nếu
// admin chưa cấu hình qua DB — xem src/lib/payment/config.ts. Thiếu cả 2
// nguồn thì tính năng tự ẩn/disable, không chặn phần còn lại của app.
import { getPaymentConfig } from "@/lib/payment/config";

export type BankInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** Mã ngân hàng chuẩn Napas, dùng để tạo QR VietQR động (img.vietqr.io). */
  bin: string | null;
};

export async function getBankInfo(): Promise<BankInfo | null> {
  const [bankName, accountNumber, accountHolder, bin] = await Promise.all([
    getPaymentConfig("bank_name"),
    getPaymentConfig("bank_account_number"),
    getPaymentConfig("bank_account_holder"),
    getPaymentConfig("bank_bin"),
  ]);
  if (!bankName || !accountNumber || !accountHolder) return null;
  return { bankName, accountNumber, accountHolder, bin: bin || null };
}

export type UsdtInfo = {
  address: string;
  /** Tỷ giá quy đổi VNĐ / 1 USDT, admin tự cập nhật theo thị trường. */
  rate: number;
};

export async function getUsdtInfo(): Promise<UsdtInfo | null> {
  const [address, rateStr] = await Promise.all([
    getPaymentConfig("usdt_trc20_address"),
    getPaymentConfig("usdt_vnd_rate"),
  ]);
  const rate = Number(rateStr);
  if (!address || !Number.isFinite(rate) || rate <= 0) return null;
  return { address, rate };
}
