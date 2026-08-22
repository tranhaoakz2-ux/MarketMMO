import { getPaymentConfig } from "@/lib/payment/config";

// Tỷ giá USDT/VNĐ cho luồng rút USDT (TRC20) của seller — src/app/api/
// seller/withdraw-request/route.ts gọi hàm này NGAY LÚC TẠO yêu cầu để
// khoá tỷ giá vào WalletTransaction (KHÔNG tính lại lúc admin duyệt).
//
// Nguồn: CoinGecko (đã tự test — trả tỷ giá USDT/VNĐ trực tiếp, không cần
// API key). ĐÃ THỬ Binance nhưng KHÔNG dùng: Binance spot không có cặp
// USDT/VND thật (USDTVND báo lỗi "Invalid symbol"; USDTBVND tồn tại nhưng
// giá luôn 0.00 — pair chết/không thanh khoản), P2P chỉ có endpoint không
// chính thức, dễ gãy — không đáng tin cho tính năng dính tiền.
//
// CoinGecko lỗi/timeout → fallback "usdt_vnd_rate" (PaymentConfig, admin tự
// cập nhật qua /admin/cai-dat, có sẵn từ trước cho luồng nạp tiền thủ công).
// Cả 2 đều thất bại → throw, CHẶN tạo yêu cầu rút — không đoán mò tỷ giá vì
// đây là bước tính tiền thật.
export type UsdtRateResult = { rate: number; source: "coingecko" | "fallback" };

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd";
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;

let cache: { rate: number; fetchedAt: number } | null = null;

async function fetchCoinGeckoRate(): Promise<number | null> {
  try {
    const res = await fetch(COINGECKO_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.tether?.vnd;
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

export async function getLiveUsdtVndRate(): Promise<UsdtRateResult> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { rate: cache.rate, source: "coingecko" };
  }

  const live = await fetchCoinGeckoRate();
  if (live) {
    cache = { rate: live, fetchedAt: Date.now() };
    return { rate: live, source: "coingecko" };
  }

  const fallbackRaw = await getPaymentConfig("usdt_vnd_rate");
  const fallbackRate = Number(fallbackRaw);
  if (Number.isFinite(fallbackRate) && fallbackRate > 0) {
    return { rate: fallbackRate, source: "fallback" };
  }

  throw new Error("Không thể xác định tỷ giá USDT/VNĐ lúc này, vui lòng thử lại sau.");
}

// Biên lợi nhuận sàn (spread) — sàn "mua USDT rẻ, bán USDT đắt" so với giá
// live, chênh lệch 2 đầu là lời của sàn. Mặc định 4% cho cả nạp/rút (chốt
// nghiệp vụ) khi admin CHƯA cấu hình gì (thiếu cả DB lẫn .env) — KHÁC hành
// vi "để trống = 0%" thường thấy ở các config khác trong dự án, cố ý theo
// đúng yêu cầu "đặt mặc định 4% sẵn, admin đổi được sau".
const DEFAULT_USDT_MARGIN_PERCENT = 4;

export type UsdtMarginRateResult = {
  /** Tỷ giá ĐÃ áp biên — dùng để tính tiền thật VÀ hiển thị, luôn cùng 1 số. */
  rate: number;
  /** Tỷ giá RAW trước khi áp biên (live CoinGecko hoặc fallback cố định). */
  baseRate: number;
  baseSource: "coingecko" | "fallback";
  marginPercent: number;
};

async function resolveMarginPercent(key: "usdt_deposit_margin_percent" | "usdt_withdraw_margin_percent"): Promise<number> {
  const raw = await getPaymentConfig(key);
  if (raw === undefined || raw.trim() === "") return DEFAULT_USDT_MARGIN_PERCENT;
  const n = Number(raw);
  // Giá trị trong DB/env đã được validate lúc admin lưu (PATCH /api/admin/
  // payment-config), nhưng .env có thể bị sửa tay sai — phòng thủ thêm ở
  // đây, rơi về mặc định thay vì áp biên vô lý (âm/quá 100%).
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : DEFAULT_USDT_MARGIN_PERCENT;
}

// Tỷ giá dùng cho luồng NẠP (buyer gửi USDT, nhận VNĐ) — sàn "mua USDT rẻ
// hơn" giá live, nên rate THẤP hơn (buyer phải gửi NHIỀU USDT hơn cho cùng 1
// số VNĐ muốn nạp). Nguồn DUY NHẤT cho cả chỗ TÍNH tiền
// (POST /api/wallet/deposit-usdt/intent) lẫn chỗ HIỂN THỊ (/nap-tien) — gọi
// cùng hàm này ở cả 2 nơi để không bao giờ lệch số.
export async function getUsdtDepositRate(): Promise<UsdtMarginRateResult> {
  const { rate: baseRate, source: baseSource } = await getLiveUsdtVndRate();
  const marginPercent = await resolveMarginPercent("usdt_deposit_margin_percent");
  const rate = baseRate * (1 - marginPercent / 100);
  return { rate, baseRate, baseSource, marginPercent };
}

// Tỷ giá dùng cho luồng RÚT (seller nhận USDT, trừ VNĐ) — sàn "bán USDT đắt
// hơn" giá live, nên rate CAO hơn (seller nhận ÍT USDT hơn cho cùng 1 số VNĐ
// muốn rút). Nguồn DUY NHẤT cho cả chỗ TÍNH tiền
// (POST /api/seller/withdraw-request) lẫn chỗ HIỂN THỊ (GET /api/seller/
// usdt-rate, preview trên SellerWithdrawPanel).
export async function getUsdtWithdrawRate(): Promise<UsdtMarginRateResult> {
  const { rate: baseRate, source: baseSource } = await getLiveUsdtVndRate();
  const marginPercent = await resolveMarginPercent("usdt_withdraw_margin_percent");
  const rate = baseRate * (1 + marginPercent / 100);
  return { rate, baseRate, baseSource, marginPercent };
}
