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
