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

export function isValidTrc20Address(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed.startsWith("T") || trimmed.length < 25 || trimmed.length > 40) return false;

  const decoded = base58Decode(trimmed);
  if (!decoded || decoded.length !== 25) return false; // 1 version + 20 địa chỉ + 4 checksum

  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21, 25);

  if (payload[0] !== TRON_ADDRESS_VERSION_BYTE) return false;

  const hash1 = createHash("sha256").update(payload).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const expectedChecksum = hash2.subarray(0, 4);

  return Buffer.compare(Buffer.from(checksum), expectedChecksum) === 0;
}
