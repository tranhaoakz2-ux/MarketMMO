// Cấu hình 2 kênh nạp tiền thủ công (thông tin nhận tiền phải là thật —
// KHÔNG tạo giá trị placeholder giả trông giống số tài khoản/địa chỉ ví thật,
// vì có thể khiến người dùng chuyển nhầm tiền thật vào nơi không xác định).
// Quản lý qua /admin/cai-dat (bảng PaymentConfig), fallback .env
// (BANK_NAME/BANK_ACCOUNT_NUMBER/... , USDT_TRC20_ADDRESS/USDT_VND_RATE) nếu
// admin chưa cấu hình qua DB — xem src/lib/payment/config.ts. Thiếu cả 2
// nguồn thì tính năng tự ẩn/disable, không chặn phần còn lại của app.
import { getPaymentConfig } from "@/lib/payment/config";
import { prisma } from "@/lib/prisma";

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

// Công tắc admin (mặc định TẮT, xem PaymentConfigKey "bank_manual_approval_enabled"
// trong src/lib/payment/config.ts) — bật tạm thời khi SePay lỗi/bảo trì để
// admin được duyệt tay nạp ngân hàng. KHÔNG ảnh hưởng webhook SePay (luôn
// chạy tự động), chỉ kiểm soát nút "Duyệt" tay cho lệnh method="bank".
export async function isBankManualApprovalEnabled(): Promise<boolean> {
  const raw = await getPaymentConfig("bank_manual_approval_enabled");
  return raw === "true";
}

// Quét CÁC lệnh nạp NGÂN HÀNG (method="bank") đã quá BANK_DEPOSIT_EXPIRY_MINUTES
// mà vẫn PENDING (chưa được webhook SePay khớp) -> chuyển EXPIRED. ĐÂY LÀ
// ĐỔI TRẠNG THÁI, TUYỆT ĐỐI KHÔNG xoá/đụng walletBalance — depositCode giữ
// nguyên trong bản ghi. Gọi LƯỜI (lazy sweep) ở các điểm buyer/admin đọc
// trạng thái (GET /api/wallet/deposit/[id], GET /api/admin/deposits) để phản
// ánh gần như tức thời, CỘNG THÊM 1 lượt quét trong GET /api/cron/daily làm
// lưới an toàn cho những lệnh không ai đọc tới (buyer đóng tab luôn).
//
// AN TOÀN TIỀN VỀ TRỄ: sau khi EXPIRED, bản ghi này rơi khỏi tập "status:
// PENDING" mà webhook SePay đang quét (src/app/api/webhook/sepay/route.ts —
// KHÔNG sửa file đó) — nếu tiền về sau đó, webhook sẽ KHÔNG tự khớp được
// nữa và tự nhiên rơi vào nhánh "chưa khớp" có sẵn (SepayUnmatchedTransaction,
// hiển thị ở /admin/nap-tien) để admin gán tay — không bao giờ mất tiền,
// chỉ chuyển từ "tự động" sang "cần admin gán tay" cho phần đã hết hạn.
export async function expireStaleBankDeposits(): Promise<number> {
  const result = await prisma.walletTransaction.updateMany({
    where: {
      type: "DEPOSIT",
      method: "bank",
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
