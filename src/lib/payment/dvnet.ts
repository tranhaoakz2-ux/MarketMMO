import { createHash, timingSafeEqual } from "crypto";
import { getPaymentConfig } from "@/lib/payment/config";

// Tích hợp DV.net (DaVinci) — cổng nạp USDT non-custodial mã nguồn mở
// (github.com/dv-net/dv-merchant). Toàn bộ cơ chế ký/endpoint dưới đây đã
// ĐỌC TRỰC TIẾP source code thật của dv-merchant (không suy đoán):
//   - Chữ ký webhook: internal/tools/hash/hash.go — SHA256Signature(data,
//     secret) = hex(sha256(data || secret)) — NỐI CHUỖI rồi băm 1 lần, KHÔNG
//     PHẢI HMAC. Điểm gọi thật: internal/service/store/webhook.go —
//     `hash.SHA256Signature(payload, wh.Secret.String)`, gửi qua header
//     "X-Sign" (SendWebhook() trong internal/service/webhook/service.go).
//   - Tạo ví nạp: POST {baseUrl}/v1/external/wallet, header "x-api-key",
//     body {amount, currency, store_external_id} — docs.dv.net/en/operations/
//     post-v1-external-wallet.html. Trả về data.pay_url (link thanh toán
//     hosted) + data.address[].address.
//   - Danh sách currency: GET {baseUrl}/v1/external/store/currencies — dùng
//     để TỰ TÌM đúng mã USDT-TRC20 thay vì đoán chuỗi (mã cụ thể tuỳ tài
//     khoản, tài liệu không công bố 1 hằng số cố định).
export const DVNET_DEFAULT_BASE_URL = "https://dv.net/api";

const FETCH_TIMEOUT_MS = 10_000;
const CURRENCY_CACHE_TTL_MS = 10 * 60_000;

export type DvnetConfig = { apiKey: string; webhookSecret: string; baseUrl: string };

export async function getDvnetConfig(): Promise<DvnetConfig | null> {
  const [apiKey, webhookSecret, baseUrlRaw] = await Promise.all([
    getPaymentConfig("dvnet_api_key"),
    getPaymentConfig("dvnet_webhook_secret"),
    getPaymentConfig("dvnet_api_base_url"),
  ]);
  if (!apiKey || !webhookSecret) return null;
  const baseUrl = (baseUrlRaw || DVNET_DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { apiKey, webhookSecret, baseUrl };
}

export async function getUsdtProvider(): Promise<"trongrid" | "dvnet"> {
  const raw = await getPaymentConfig("usdt_provider");
  return raw === "dvnet" ? "dvnet" : "trongrid";
}

// hex(sha256(data || secret)) — khớp CHÍNH XÁC internal/tools/hash/hash.go
// (SHA256Signature), nối trực tiếp bytes secret vào SAU data rồi băm 1 lần.
export function dvnetSignature(data: Buffer | string, secret: string): string {
  const dataBuf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const secretBuf = Buffer.from(secret, "utf8");
  return createHash("sha256").update(Buffer.concat([dataBuf, secretBuf])).digest("hex");
}

export function verifyDvnetSignature(rawBody: string, secret: string, headerSign: string | null): boolean {
  if (!headerSign) return false;
  const expected = dvnetSignature(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(headerSign.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type DvnetCurrency = {
  code: string;
  name: string;
  blockchain: string;
  is_fiat: boolean;
  status: boolean;
};

let currencyCache: { code: string; fetchedAt: number; baseUrl: string } | null = null;

async function dvnetFetch(config: DvnetConfig, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cổng nạp USDT lỗi: ${message}`);
  }
  return body;
}

// Tự tìm mã currency USDT-TRC20 từ chính danh sách tiền tệ tài khoản DV.net
// của bạn — KHÔNG hardcode 1 chuỗi đoán trước (mỗi tài khoản/instance DV.net
// có thể đặt mã khác nhau). Cache ngắn hạn tránh gọi API mỗi lần buyer tạo
// yêu cầu nạp.
export async function findUsdtTrc20CurrencyCode(config: DvnetConfig): Promise<string> {
  if (currencyCache && currencyCache.baseUrl === config.baseUrl && Date.now() - currencyCache.fetchedAt < CURRENCY_CACHE_TTL_MS) {
    return currencyCache.code;
  }

  const body = (await dvnetFetch(config, "/v1/external/store/currencies")) as { data?: DvnetCurrency[] };
  const currencies = Array.isArray(body?.data) ? body.data : [];

  const match = currencies.find(
    (c) =>
      !c.is_fiat &&
      c.status !== false &&
      /usdt/i.test(c.code ?? "") &&
      /(tron|trc)/i.test(c.blockchain ?? "")
  );
  if (!match) {
    throw new Error(
      "Không tìm thấy USDT-TRC20 trong danh sách currency được hỗ trợ — vui lòng thử lại sau hoặc liên hệ hỗ trợ."
    );
  }

  currencyCache = { code: match.code, fetchedAt: Date.now(), baseUrl: config.baseUrl };
  return match.code;
}

export type CreateDvnetDepositResult = {
  payUrl: string;
  dvnetId: string;
  // Địa chỉ ví TRC20 DV.net cấp riêng cho lượt nạp này (data.address[0].address,
  // xem comment đầu file) — để hiện QR/địa chỉ ngay trên sàn thay vì đẩy buyer
  // sang payUrl. null nếu DV.net không trả mảng address (hiếm, nhưng KHÔNG
  // chặn tạo lệnh — nơi gọi tự fallback về payUrl khi null).
  walletAddress: string | null;
};

export async function createDvnetDeposit(params: {
  config: DvnetConfig;
  amount: number;
  currency: string;
  storeExternalId: string;
}): Promise<CreateDvnetDepositResult> {
  const body = (await dvnetFetch(params.config, "/v1/external/wallet", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      store_external_id: params.storeExternalId,
    }),
  })) as { data?: { pay_url?: string; id?: string; address?: { address?: string }[] } };

  const payUrl = body?.data?.pay_url;
  const dvnetId = body?.data?.id;
  if (!payUrl || !dvnetId) {
    throw new Error("Không nhận được thông tin thanh toán hợp lệ từ cổng nạp USDT.");
  }
  // Phần tử ĐẦU của mảng address — KHÔNG throw nếu rỗng/thiếu, đây là field
  // "cố gắng lấy thêm", pay_url vẫn luôn là nguồn tin cậy bắt buộc ở trên.
  const walletAddress = body?.data?.address?.[0]?.address ?? null;
  return { payUrl, dvnetId, walletAddress };
}

// Payload webhook "PaymentReceived" — CHỈ các field ta thực sự dùng, đọc từ
// internal/service/store/webhook.go (prepareDepositHookPayload). Khi giao
// dịch CHƯA confirm, mọi key (kể cả "type") được đổi tên thêm tiền tố
// "unconfirmed_" — route webhook phải tự dò cả 2 dạng key.
export type DvnetWebhookPayload = {
  type?: string;
  unconfirmed_type?: string;
  transactions?: { tx_id?: string; amount_usd?: string };
  unconfirmed_transactions?: { tx_id?: string; amount_usd?: string };
  wallet?: { store_external_id?: string };
  unconfirmed_wallet?: { store_external_id?: string };
};

export function parseDvnetWebhookPayload(payload: DvnetWebhookPayload): {
  type: string | null;
  txId: string | null;
  amountUsd: number | null;
  storeExternalId: string | null;
} {
  const type = payload.type ?? payload.unconfirmed_type ?? null;
  const transactions = payload.transactions ?? payload.unconfirmed_transactions ?? null;
  const wallet = payload.wallet ?? payload.unconfirmed_wallet ?? null;
  const amountUsd = transactions?.amount_usd ? Number(transactions.amount_usd) : null;
  return {
    type,
    txId: transactions?.tx_id ?? null,
    amountUsd: Number.isFinite(amountUsd) ? amountUsd : null,
    storeExternalId: wallet?.store_external_id ?? null,
  };
}
