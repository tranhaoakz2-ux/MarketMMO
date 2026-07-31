import { createHash } from "crypto";

// Validate địa chỉ ví TRON (TRC20) — seller tự nhập làm nơi nhận tiền rút,
// admin chuyển tay theo đúng địa chỉ này nên gõ sai KHÔNG THỂ lấy lại tiền
// đã gửi (đặc tính của blockchain) — bắt buộc validate CHẶT (base58check
// đầy đủ, không chỉ regex hình thức) để chặn lỗi gõ tay sớm nhất có thể.
//
// Cấu trúc: base58(payload 21 byte [0x41 + 20 byte địa chỉ] + checksum 4
// byte đầu của SHA256(SHA256(payload))). Độ dài chuỗi base58 KHÔNG cố định
// tuyệt đối 34 (phụ thuộc số byte 0x00 dẫn đầu được mã hoá thành ký tự "1"),
// nên không dùng regex đếm ký tự cứng — decode thật rồi so khớp version
// byte + checksum là cách duy nhất đáng tin.

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_MAP = new Map([...BASE58_ALPHABET].map((c, i) => [c, BigInt(i)]));
const TRON_ADDRESS_VERSION_BYTE = 0x41;

// Dùng BigInt(n) thay vì literal "58n" — tsconfig target ES2017 của dự án
// không hỗ trợ cú pháp BigInt literal, dù BigInt vẫn chạy được ở runtime.
const ZERO = BigInt(0);
const BASE = BigInt(58);
const BYTE_BASE = BigInt(256);

function base58Decode(input: string): Uint8Array | null {
  if (!input) return null;
  let num = ZERO;
  for (const ch of input) {
    const digit = BASE58_MAP.get(ch);
    if (digit === undefined) return null; // ký tự ngoài bảng base58 (vd 0, O, I, l)
    num = num * BASE + digit;
  }

  // Chuyển BigInt về mảng byte big-endian.
  const bytes: number[] = [];
  while (num > ZERO) {
    bytes.unshift(Number(num % BYTE_BASE));
    num /= BYTE_BASE;
  }

  // Mỗi ký tự "1" dẫn đầu tương ứng 1 byte 0x00 dẫn đầu bị mất khi decode số.
  let leadingZeros = 0;
  for (const ch of input) {
    if (ch === "1") leadingZeros++;
    else break;
  }

  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

function base58Encode(bytes: Uint8Array): string {
  let num = ZERO;
  for (const b of bytes) num = num * BYTE_BASE + BigInt(b);
  let out = "";
  while (num > ZERO) {
    out = BASE58_ALPHABET[Number(num % BASE)] + out;
    num /= BASE;
  }
  let leadingZeros = 0;
  for (const b of bytes) {
    if (b === 0) leadingZeros++;
    else break;
  }
  return "1".repeat(leadingZeros) + out;
}

// Decode + verify base58check, trả về 20 byte địa chỉ THÔ (bỏ version byte
// + checksum) nếu hợp lệ, null nếu không — dùng chung cho isValidTrc20Address
// (chỉ cần biết hợp lệ hay không) VÀ trc20AddressToHex (cần lấy đúng 20 byte
// để so khớp với địa chỉ trong log on-chain, xem src/lib/payment/
// tron-verify.ts) — 1 nguồn logic decode duy nhất, không lặp lại.
function decodeAndVerifyTrc20(address: string): Uint8Array | null {
  const trimmed = address.trim();
  if (!trimmed.startsWith("T") || trimmed.length < 25 || trimmed.length > 40) return null;

  const decoded = base58Decode(trimmed);
  if (!decoded || decoded.length !== 25) return null; // 1 version + 20 địa chỉ + 4 checksum

  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21, 25);

  if (payload[0] !== TRON_ADDRESS_VERSION_BYTE) return null;

  const hash1 = createHash("sha256").update(payload).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const expectedChecksum = hash2.subarray(0, 4);

  if (Buffer.compare(Buffer.from(checksum), expectedChecksum) !== 0) return null;
  return payload.subarray(1); // bỏ version byte, chỉ còn đúng 20 byte địa chỉ
}

export function isValidTrc20Address(address: string): boolean {
  return decodeAndVerifyTrc20(address) !== null;
}

// Trả về 20 byte địa chỉ dạng hex thường (không tiền tố "0x"/"41") — dùng để
// so khớp địa chỉ ví sàn/contract USDT với dữ liệu hex thô trả về từ TronGrid
// (xem src/lib/payment/tron-verify.ts), tránh phải encode/decode qua lại
// base58 nhiều lần khi so sánh.
export function trc20AddressToHex(address: string): string | null {
  const raw = decodeAndVerifyTrc20(address);
  return raw ? Buffer.from(raw).toString("hex") : null;
}

// Chiều ngược lại — 20 byte hex -> địa chỉ T... — dùng khi cần hiển thị lại
// địa chỉ người gửi (from) lấy được từ log on-chain cho admin xem.
export function hexToTrc20Address(hex20byte: string): string | null {
  if (!/^[0-9a-fA-F]{40}$/.test(hex20byte)) return null;
  const addressBytes = Buffer.from(hex20byte, "hex");
  const payload = Buffer.concat([Buffer.from([TRON_ADDRESS_VERSION_BYTE]), addressBytes]);
  const hash1 = createHash("sha256").update(payload).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const checksum = hash2.subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}
