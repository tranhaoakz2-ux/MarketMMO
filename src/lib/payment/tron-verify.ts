import { trc20AddressToHex, hexToTrc20Address } from "@/lib/payment/trc20";

// Xác minh 1 giao dịch nạp USDT (TRC20) THẬT SỰ đã xảy ra trên blockchain,
// dùng cho POST /api/wallet/deposit-usdt — đây là bước DUY NHẤT quyết định
// có cộng tiền tự động hay không, nên mọi điều kiện đều phải strict, không
// suy đoán. KHÔNG bao giờ tin số USDT/địa chỉ do client tự khai.
//
// Nguồn: TronGrid (`walletsolidity/gettransactioninfobyid`) — dùng đúng
// endpoint quét theo chain ĐÃ SOLID HOÁ (khái niệm "irreversible" chuẩn của
// Tron, không phải tự đặt số block tối thiểu tuỳ ý): giao dịch chưa đủ xác
// nhận hoặc không tồn tại đều trả về rỗng {} — 2 trường hợp này không phân
// biệt được từ response và KHÔNG CẦN phân biệt, vì cả 2 đều dẫn tới cùng 1
// hành động đúng: chưa cộng tiền, để hệ thống/buyer thử lại sau hoặc admin
// xử lý tay.
//
// Đọc SỐ USDT THỰC từ EVENT LOG (Transfer(address,address,uint256)) do
// chính contract token phát ra khi chuyển tiền thành công — đây là bản ghi
// xác thực nhất về việc GIÁ TRỊ ĐÃ THỰC SỰ DI CHUYỂN, đáng tin hơn việc đọc
// tham số của lệnh gọi (calldata) vì calldata chỉ phản ánh Ý ĐỊNH gọi hàm,
// không đảm bảo khớp đúng những gì đã thực thi. Chữ ký sự kiện Transfer
// (`ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`) đã
// được xác nhận trực tiếp bằng dữ liệu on-chain thật khi phát triển tính
// năng này, không phải suy đoán.

export const USDT_TRC20_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const USDT_DECIMALS = 6;
const TRANSFER_EVENT_TOPIC0 = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Cho phép trỏ sang node/API khác khi cần (vd tự host, hoặc API key riêng
// cho hạn mức cao hơn) — mặc định TronGrid công khai, không cần key.
const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL?.replace(/\/+$/, "") || "https://api.trongrid.io";
const FETCH_TIMEOUT_MS = 8000;

export type TronVerifyResult =
  | { ok: true; usdtAmountRaw: bigint; usdtAmount: number; senderAddress: string | null }
  | { ok: false; reason: string };

type TronTransactionInfo = {
  id?: string;
  receipt?: { result?: string };
  log?: { address?: string; topics?: string[]; data?: string }[];
};

function last20BytesHex(topic32ByteHex: string): string {
  return topic32ByteHex.slice(-40).toLowerCase();
}

export async function verifyUsdtDeposit(
  txid: string,
  expectedRecipientAddress: string
): Promise<TronVerifyResult> {
  const expectedRecipientHex = trc20AddressToHex(expectedRecipientAddress);
  if (!expectedRecipientHex) {
    return { ok: false, reason: "Địa chỉ ví nhận của sàn chưa cấu hình hợp lệ." };
  }
  const usdtContractHex = trc20AddressToHex(USDT_TRC20_CONTRACT_ADDRESS)!;

  let data: TronTransactionInfo;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
    const res = await fetch(`${TRONGRID_BASE_URL}/walletsolidity/gettransactioninfobyid`, {
      method: "POST",
      headers,
      body: JSON.stringify({ value: txid }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, reason: `TronGrid trả lỗi HTTP ${res.status}, không thể xác minh lúc này.` };
    }
    data = await res.json();
  } catch {
    return { ok: false, reason: "Không thể kết nối tới mạng Tron để xác minh giao dịch lúc này." };
  }

  // Rỗng = chưa solid hoá (chưa đủ xác nhận) HOẶC không tồn tại — không phân
  // biệt, cả 2 đều KHÔNG cộng tiền ở bước này.
  if (!data || !data.id) {
    return { ok: false, reason: "Chưa tìm thấy giao dịch đã xác nhận đủ trên blockchain với mã này." };
  }
  if (data.id !== txid) {
    return { ok: false, reason: "Dữ liệu trả về không khớp mã giao dịch đã nhập." };
  }
  if (data.receipt?.result !== "SUCCESS") {
    return { ok: false, reason: "Giao dịch trên blockchain không thành công (bị revert)." };
  }

  // Quét TOÀN BỘ log tìm sự kiện Transfer do ĐÚNG contract USDT phát ra, gửi
  // tới ĐÚNG ví sàn — nguồn duy nhất quyết định "có phải nạp USDT hợp lệ
  // không", không dựa vào field nào khác ở tầng transaction.
  let totalRaw = BigInt(0);
  let senderHex: string | null = null;
  for (const log of data.log ?? []) {
    const logAddress = (log.address ?? "").toLowerCase();
    const topics = log.topics ?? [];
    if (logAddress !== usdtContractHex) continue;
    if ((topics[0] ?? "").toLowerCase() !== TRANSFER_EVENT_TOPIC0) continue;
    const toHex = last20BytesHex(topics[2] ?? "");
    if (toHex !== expectedRecipientHex) continue;

    const valueHex = log.data ?? "0";
    try {
      totalRaw += BigInt(`0x${valueHex}`);
    } catch {
      continue;
    }
    senderHex = last20BytesHex(topics[1] ?? "") || senderHex;
  }

  if (totalRaw <= BigInt(0)) {
    return {
      ok: false,
      reason: "Không tìm thấy giao dịch chuyển USDT (TRC20) tới đúng địa chỉ ví của sàn trong mã này.",
    };
  }

  const usdtAmount = Number(totalRaw) / 10 ** USDT_DECIMALS;
  return {
    ok: true,
    usdtAmountRaw: totalRaw,
    usdtAmount,
    senderAddress: senderHex ? hexToTrc20Address(senderHex) : null,
  };
}
