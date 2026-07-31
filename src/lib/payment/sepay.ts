import { getPaymentConfig } from "@/lib/payment/config";

// Helpers cho webhook SePay (POST /api/webhook/sepay) — tách riêng khỏi route
// để dễ unit-test bằng payload giả lập mà không cần chạy qua Next.js request.

// Cho trang /nap-tien biết có nên hiện copy "tự động cộng tiền trong vài
// phút" hay giữ nguyên copy "chờ admin duyệt" cũ — cùng pattern
// isVnpayConfigured() (src/lib/payment/vnpay.ts).
export async function isSepayConfigured(): Promise<boolean> {
  const [secret, apiKey] = await Promise.all([
    getPaymentConfig("sepay_webhook_secret"),
    getPaymentConfig("sepay_api_key"),
  ]);
  return !!(secret || apiKey);
}

// Mã định danh nạp tiền ngân hàng hiện có dạng "NAP<6 ký tự cuối userId viết
// hoa><4 ký tự random>" (sinh ở DepositPanel.tsx, lưu trong
// WalletTransaction.note dạng "Nội dung CK: <mã>") — luôn thuần chữ+số viết
// hoa. Không thêm cột riêng lưu mã có cấu trúc: trích lại từ note bằng regex
// là đủ tin cậy vì tiền tố "NAP" gần như không thể trùng ngẫu nhiên với văn
// bản khác trong nội dung chuyển khoản ngân hàng.
const DEPOSIT_CODE_REGEX = /NAP[A-Z0-9]{6,}/;

export function extractDepositCode(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.toUpperCase().match(DEPOSIT_CODE_REGEX);
  return match ? match[0] : null;
}

// Chuẩn hoá để so khớp: chữ hoa + chỉ giữ A-Z0-9 — ngân hàng thường chèn
// thêm khoảng trắng/dấu chấm/tiền tố "CT tu ... toi ... noi dung ..." vào
// nội dung chuyển khoản gốc, nên so khớp "chứa" trên chuỗi đã lọc sạch thay
// vì so khớp chính xác toàn bộ chuỗi.
export function normalizeForMatch(s: string | null | undefined): string {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type SepayWebhookPayload = {
  id: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string;
  code?: string | null;
  content?: string;
  transferType?: string;
  description?: string;
  transferAmount?: number;
  accumulated?: number;
  referenceCode?: string;
};

// Validate tối thiểu cấu trúc payload trước khi xử lý tiếp — KHÔNG suy đoán
// field thiếu, từ chối sớm nếu thiếu field bắt buộc để tính tiền/chống trùng.
export function isValidSepayPayload(data: unknown): data is SepayWebhookPayload {
  if (!data || typeof data !== "object") return false;
  const p = data as Record<string, unknown>;
  return (
    (typeof p.id === "number" || typeof p.id === "string") &&
    typeof p.transferAmount === "number" &&
    Number.isFinite(p.transferAmount) &&
    p.transferAmount > 0
  );
}
