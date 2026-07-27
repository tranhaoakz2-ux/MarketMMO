import crypto from "node:crypto";

// Mã hoá 2 chiều CHO field nhạy cảm của dịch vụ (mật khẩu/OTP buyer cung cấp
// cho seller thực hiện) — AES-256-GCM bằng Node `crypto` built-in, không
// thêm dependency mới. KHÁC hẳn SHA-256 (mã OTP quên mật khẩu) và bcrypt
// (mật khẩu đăng nhập) đã có trong dự án — cả 2 cái đó là MỘT CHIỀU, không
// đảo ngược được, không dùng được ở đây vì seller cần xem lại giá trị gốc.
//
// FAIL-CLOSED — khác quy ước "env-gated optional" của VNPay/Telegram/Resend
// trong dự án (thiếu key thì tự tắt tính năng, không chặn phần còn lại của
// app): thiếu SERVICE_CREDENTIAL_ENCRYPTION_KEY phải CHẶN CỨNG việc nhận
// field nhạy cảm, tuyệt đối không có đường lùi lưu plaintext. Nơi gọi
// (POST /api/checkout) phải bắt lỗi từ đây và trả lỗi rõ ràng cho buyer,
// không để lộ exception thô.
//
// KHÔNG BAO GIỜ console.log/ghi log giá trị plaintext hay ciphertext ở file
// này hoặc bất kỳ nơi nào gọi tới — kể cả trong nhánh lỗi.

const ALGORITHM = "aes-256-gcm";
// IV 12 byte là khuyến nghị tiêu chuẩn cho GCM (NIST SP 800-38D) — không
// đổi trừ khi có lý do mật mã học cụ thể.
const IV_LENGTH_BYTES = 12;
// Tăng khi xoay khoá thật sự (đổi SERVICE_CREDENTIAL_ENCRYPTION_KEY) — lưu
// kèm mỗi bản ghi để biết khoá nào đã dùng, phục vụ xoay khoá về sau mà
// không làm hỏng dữ liệu cũ đã mã hoá bằng khoá trước đó.
export const CURRENT_SERVICE_ENCRYPTION_KEY_VERSION = 1;

function loadKey(): Buffer {
  const hex = process.env.SERVICE_CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SERVICE_CREDENTIAL_ENCRYPTION_KEY chưa cấu hình hoặc sai định dạng (cần đúng 64 ký tự hex = 32 byte, sinh bằng `openssl rand -hex 32`)."
    );
  }
  return Buffer.from(hex, "hex");
}

// Dùng để BÁO TRƯỚC (fail sớm, thông báo rõ ràng) trước khi buyer nhập cả
// form dịch vụ chỉ để nhận lỗi cấu hình ở bước cuối — không thay thế
// try/catch quanh encrypt/decrypt thật sự.
export function isServiceEncryptionConfigured(): boolean {
  const hex = process.env.SERVICE_CREDENTIAL_ENCRYPTION_KEY;
  return Boolean(hex && hex.length === 64);
}

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

// Mã hoá NGUYÊN 1 object thành 1 blob duy nhất (không mã hoá từng field
// riêng) — đơn giản hơn, vẫn đủ an toàn vì toàn bộ chỉ giải mã cùng lúc,
// cùng 1 điều kiện quyền (seller đã "Nhận đơn" + còn trong cửa sổ xem).
export function encryptSensitiveFields(data: Record<string, string>): EncryptedBlob {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: CURRENT_SERVICE_ENCRYPTION_KEY_VERSION,
  };
}

// Ném lỗi nếu ciphertext/authTag không khớp khoá hiện tại (dữ liệu hỏng/bị
// sửa, hoặc khoá đã đổi) — KHÔNG bao giờ trả về dữ liệu một phần.
export function decryptSensitiveFields(blob: {
  ciphertext: string;
  iv: string;
  authTag: string;
}): Record<string, string> {
  const key = loadKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}
