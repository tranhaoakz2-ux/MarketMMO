// Mã đơn dễ đọc/tra cứu (AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 1) — dạng
// "DH-XXXXXX", CHỈ để hiển thị/tra cứu (lịch sử đơn, khiếu nại, admin tra
// theo mã buyer cung cấp qua chat hỗ trợ). KHÔNG thay Order.id làm khoá
// chính — id ngẫu nhiên (cuid) vẫn là khoá chính vì lý do bảo mật.
const CODE_LENGTH = 6;
// Cùng bảng chữ đã dùng cho mã giới thiệu (src/lib/referral.ts) — bỏ ký tự
// dễ nhầm (0/O, 1/I) để buyer đọc/gõ lại chính xác khi liên hệ hỗ trợ.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateOrderCode(): string {
  let code = "DH-";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Số lần thử tối đa khi tạo đơn bị trùng orderCode (xác suất cực thấp — 33^6
// ≈ 1.29 tỷ tổ hợp — nhưng vẫn xử lý cho chắc). Đặt orderCode BÊN NGOÀI
// prisma.$transaction() của POST /api/checkout: nếu unique-violation xảy ra
// TRONG 1 transaction, Postgres huỷ ngay transaction đó (không thể "thử lại
// tại chỗ" như ensureReferralCode() — hàm đó không nằm trong transaction
// nào khác). Vì vậy checkout phải bọc TOÀN BỘ transaction trong vòng lặp
// retry này, sinh orderCode MỚI mỗi lần thử lại.
export const ORDER_CODE_MAX_RETRIES = 3;
