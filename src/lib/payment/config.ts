import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Cấu hình thanh toán quản lý qua Admin (/admin/cai-dat) thay vì chỉ .env —
// xem model PaymentConfig trong prisma/schema.prisma. Giá trị DB (nếu admin
// đã lưu) LUÔN ưu tiên hơn .env; thiếu dòng/value rỗng thì tự fallback về
// biến môi trường cùng tên bên dưới — không phá vỡ cấu hình production hiện
// có, chỉ khi admin chủ động lưu mới ghi đè.
export type PaymentConfigKey =
  | "vnpay_tmn_code"
  | "vnpay_hash_secret"
  | "usdt_trc20_address"
  | "usdt_vnd_rate"
  | "bank_name"
  | "bank_account_number"
  | "bank_account_holder"
  | "bank_bin"
  | "sepay_webhook_secret"
  | "sepay_api_key"
  | "usdt_deposit_margin_percent"
  | "usdt_withdraw_margin_percent"
  | "usdt_provider"
  | "dvnet_api_key"
  | "dvnet_webhook_secret"
  | "dvnet_api_base_url";

const ENV_FALLBACK: Record<PaymentConfigKey, string | undefined> = {
  vnpay_tmn_code: process.env.VNPAY_TMN_CODE,
  vnpay_hash_secret: process.env.VNPAY_HASH_SECRET,
  usdt_trc20_address: process.env.USDT_TRC20_ADDRESS,
  usdt_vnd_rate: process.env.USDT_VND_RATE,
  bank_name: process.env.BANK_NAME,
  bank_account_number: process.env.BANK_ACCOUNT_NUMBER,
  bank_account_holder: process.env.BANK_ACCOUNT_HOLDER,
  bank_bin: process.env.BANK_BIN,
  // SePay webhook (POST /api/webhook/sepay) — hỗ trợ CẢ 2 phương thức xác
  // thực SePay cung cấp, chưa biết bạn sẽ chọn cái nào lúc đăng ký thật:
  // HMAC-SHA256 (mạnh hơn, ký trên raw body) dùng sepay_webhook_secret, API
  // Key (đơn giản hơn) dùng sepay_api_key. Thiếu CẢ 2 -> webhook fail-closed
  // 503, không cộng tiền — xem src/app/api/webhook/sepay/route.ts.
  sepay_webhook_secret: process.env.SEPAY_WEBHOOK_SECRET,
  sepay_api_key: process.env.SEPAY_API_KEY,
  // Biên lợi nhuận sàn (spread) áp lên tỷ giá USDT/VNĐ THEO CHIỀU GIAO DỊCH —
  // KHÁC "usdt_vnd_rate" ở trên (đó chỉ là số dự phòng khi CoinGecko sập,
  // không phải biên lời). Đọc + áp dụng trong src/lib/payment/exchange-rate.ts
  // (getUsdtDepositRate()/getUsdtWithdrawRate()) — thiếu cả DB lẫn .env thì
  // dùng mặc định DEFAULT_USDT_MARGIN_PERCENT=4 code-hoá sẵn (không phải 0%),
  // theo yêu cầu nghiệp vụ đã chốt.
  usdt_deposit_margin_percent: process.env.USDT_DEPOSIT_MARGIN_PERCENT,
  usdt_withdraw_margin_percent: process.env.USDT_WITHDRAW_MARGIN_PERCENT,
  // Chọn cổng xử lý nạp USDT: "trongrid" (mặc định, địa chỉ tĩnh + xác minh
  // on-chain qua TronGrid, xem usdt_trc20_address ở trên) hoặc "dvnet" (cổng
  // DV.net — tạo ví/link thanh toán riêng từng lượt nạp qua API, webhook tự
  // báo kết quả). Đặt thành key riêng (không phải chỉ .env) để đổi được
  // ngay từ /admin/cai-dat, không cần deploy lại — dễ revert nếu DV.net có
  // sự cố. Giá trị khác "dvnet" (kể cả rỗng/chưa cấu hình) → coi như "trongrid".
  usdt_provider: process.env.USDT_PROVIDER,
  // DV.net (non-custodial crypto payment gateway, github.com/dv-net) — API
  // key dùng để GỌI DV.net tạo ví nạp (header x-api-key, xem
  // src/lib/payment/dvnet.ts), KHÁC webhook secret bên dưới (dùng để XÁC
  // MINH webhook DV.net gửi VỀ, không phải để gọi đi).
  dvnet_api_key: process.env.DVNET_API_KEY,
  dvnet_webhook_secret: process.env.DVNET_WEBHOOK_SECRET,
  // Base URL API DV.net — mặc định "https://dv.net/api" nếu bỏ trống (xem
  // DVNET_DEFAULT_BASE_URL trong dvnet.ts), chỉ cần điền nếu dashboard DV.net
  // cấp domain/subdomain API riêng khác domain mặc định.
  dvnet_api_base_url: process.env.DVNET_API_BASE_URL,
};

export const ALL_PAYMENT_CONFIG_KEYS = Object.keys(ENV_FALLBACK) as PaymentConfigKey[];

// Bọc React cache() để nhiều lần gọi getPaymentConfig()/getPaymentConfigWithSource()
// trong cùng 1 request (vd nap-tien/page.tsx gọi cả getBankInfo + getUsdtInfo +
// isVnpayConfigured) chỉ tốn đúng 1 query DB — cùng pattern getAuthSession()
// trong src/lib/authz.ts.
const loadDbConfig = cache(async () => {
  const rows = await prisma.paymentConfig.findMany();
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.value && row.value.trim()) map.set(row.key, row.value.trim());
  }
  return map;
});

/** Giá trị HIỆU LỰC hiện tại (DB nếu admin đã lưu, không thì fallback .env). */
export async function getPaymentConfig(key: PaymentConfigKey): Promise<string | undefined> {
  const db = await loadDbConfig();
  return db.get(key) ?? ENV_FALLBACK[key];
}

export type PaymentConfigSource = "db" | "env" | "none";

/**
 * Dùng cho admin UI — trả giá trị hiệu lực KÈM nguồn cho từng key, để hiện
 * đúng nhãn "Admin đã cấu hình" / "Đang dùng mặc định .env" / "Chưa cấu hình".
 */
export async function getPaymentConfigWithSource(): Promise<
  Record<PaymentConfigKey, { value: string | undefined; source: PaymentConfigSource }>
> {
  const db = await loadDbConfig();
  const result = {} as Record<PaymentConfigKey, { value: string | undefined; source: PaymentConfigSource }>;
  for (const key of ALL_PAYMENT_CONFIG_KEYS) {
    const dbValue = db.get(key);
    if (dbValue) {
      result[key] = { value: dbValue, source: "db" };
    } else if (ENV_FALLBACK[key]) {
      result[key] = { value: ENV_FALLBACK[key], source: "env" };
    } else {
      result[key] = { value: undefined, source: "none" };
    }
  }
  return result;
}
