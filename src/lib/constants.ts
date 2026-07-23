export type Role = "BUYER" | "SELLER" | "ADMIN";

export const roleLabel: Record<Role, string> = {
  BUYER: "Người mua",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
};

export type OrderStatus = "ESCROW" | "RELEASED" | "CANCELLED" | "DISPUTED";

export type WalletTxType =
  | "DEPOSIT"
  | "PURCHASE"
  | "PAYOUT"
  | "REFUND"
  | "REFERRAL_BONUS"
  | "WITHDRAW"
  | "INSURANCE_DEPOSIT";

export type WalletTxStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type DisputeStatus =
  | "OPEN"
  | "RESOLVED_REFUND"
  | "RESOLVED_PARTIAL"
  | "RESOLVED_RELEASE";

export type ProductStatus = "PENDING" | "APPROVED" | "REJECTED";

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

export type CategoryStatus = "PENDING" | "APPROVED" | "REJECTED";

export const CATEGORY_STATUS_LABEL: Record<CategoryStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

// Kho dữ liệu giao hàng thật (ProductStockItem) — xem prisma/schema.prisma.
// BURNED = đơn vị đã giao rồi bị HOÀN TOÀN BỘ tiền qua khiếu nại: content đã
// lộ nên KHÔNG trả về AVAILABLE (không bán lại), tách khỏi SOLD để thống kê
// thiệt hại cho seller (số đơn vị mất do hoàn tiền). Xem SECURITY_AUDIT #8.
export type StockItemStatus = "AVAILABLE" | "SOLD" | "BURNED";

export type DiscountType = "PERCENT" | "FIXED";

// Khoảng ngày lọc doanh thu ở Quản Lý Bán Hàng (Tổng quan).
export type RangeKey = "today" | "yesterday" | "7d" | "month" | "last_month" | "custom";

export type ForumCategory =
  | "Kinh nghiệm"
  | "Chia sẻ"
  | "Hỏi đáp"
  | "Cảnh báo"
  | "Mua bán"
  | "Thông báo";

export const FORUM_CATEGORIES: ForumCategory[] = [
  "Kinh nghiệm",
  "Chia sẻ",
  "Hỏi đáp",
  "Cảnh báo",
  "Mua bán",
  "Thông báo",
];

export const ESCROW_HOLD_DAYS = 3;

// Quên mật khẩu: link reset hết hạn sau ngần này phút kể từ lúc yêu cầu.
export const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 60;

// ── Hoa hồng affiliate (xem src/lib/commission.ts + model ReferralCommission) ──
// % hoa hồng + margin sàn KHÔNG còn hardcode — lưu trong DB (CommissionSetting,
// admin sửa qua UI). Các hằng dưới CHỈ là giá trị KHỞI TẠO khi tạo singleton
// lần đầu.
//   - Margin 10% ("phần sàn thực thu ròng") = trần cho %hoa hồng (chốt cùng user).
//   - Hoa hồng khởi tạo 5% = nửa ngưỡng margin → luôn < margin, an toàn.
//   - Cap 0 = không giới hạn/kỳ (theo lựa chọn; bật sau bằng cách set > 0).
export const COMMISSION_SETTING_ID = "singleton";
// Hoa hồng 4% < phí sàn 10% / 2 = 5% → "phần sàn thực thu ròng" (phí − hoa
// hồng = 6%) luôn LỚN HƠN hoa hồng (4%). Xem ràng buộc ở settings.
export const DEFAULT_COMMISSION_PERCENT = 4;
export const DEFAULT_PLATFORM_MARGIN_PERCENT = 10;
export const DEFAULT_PER_REFERRER_CAP = 0;
export const DEFAULT_CAP_PERIOD_DAYS = 30;

// ── Phí sàn (platform fee) — % chung cho MỌI seller/mọi đơn (xem
// src/lib/platform-fee.ts + model PlatformFeeSetting/Schedule). Hằng dưới CHỈ
// là giá trị KHỞI TẠO singleton lần đầu; admin sửa qua Admin > Phí sàn.
export const PLATFORM_FEE_SETTING_ID = "singleton";
export const DEFAULT_PLATFORM_FEE_PERCENT = 10;

export type CommissionStatus = "PENDING" | "ELIGIBLE" | "PAID" | "CANCELLED";

export const commissionStatusLabel: Record<CommissionStatus, string> = {
  PENDING: "Chờ đủ điều kiện",
  ELIGIBLE: "Đủ điều kiện — chờ giải ngân",
  PAID: "Đã giải ngân",
  CANCELLED: "Đã huỷ (đơn hoàn/huỷ)",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  ESCROW: "Đang ký quỹ",
  RELEASED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  DISPUTED: "Đang tranh chấp",
};

export const walletTxStatusLabel: Record<WalletTxStatus, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã cộng tiền",
  REJECTED: "Từ chối",
};

export const walletTxTypeLabel: Record<WalletTxType, string> = {
  DEPOSIT: "Nạp tiền",
  PURCHASE: "Mua hàng",
  PAYOUT: "Nhận thanh toán",
  REFUND: "Hoàn tiền",
  REFERRAL_BONUS: "Hoa hồng giới thiệu",
  WITHDRAW: "Rút tiền",
  INSURANCE_DEPOSIT: "Nạp quỹ bảo hiểm",
};

// Category nào được coi là "dịch vụ" khi seller xem đơn hàng trong Trang Bán
// Hàng — tái dùng đúng heuristic đã dùng ở NavMegaMenu (mục "Dịch vụ" trên nav
// chính) vì schema chưa tách bảng dịch vụ khỏi sản phẩm, không phải field DB thật.
export const SERVICE_CATEGORY_SLUGS = ["boosting", "chatgpt", "youtube"];

// Mức quỹ bảo hiểm gợi ý hiển thị cho seller (KHÔNG bắt buộc, chỉ mang tính
// khuyến khích/tín nhiệm — MarketMMO không chặn tính năng bán hàng như shopmini.pro).
export const INSURANCE_FUND_TARGET = 300000;

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  OPEN: "Đang chờ xử lý",
  RESOLVED_REFUND: "Đã hoàn toàn bộ cho người mua",
  RESOLVED_PARTIAL: "Đã hoàn một phần",
  RESOLVED_RELEASE: "Đã giải ngân người bán",
};

// Số tiền tối thiểu 1 mã giảm giá được phép giảm về — không cho phép giảm
// giá trị 1 item xuống dưới mức này để tránh mã FIXED giá trị lớn hơn giá sản
// phẩm biến giao dịch thành "gần như miễn phí" ngoài ý muốn của seller.
export const MIN_ITEM_PRICE_AFTER_DISCOUNT = 1000;

// method là chuỗi tự do (WalletTransaction.method), map sang nhãn hiển thị.
// "manual" giữ lại để tương thích các bản ghi cũ trước khi tách thành "bank".
export const walletMethodLabel: Record<string, string> = {
  vnpay: "VNPay",
  bank: "Chuyển khoản ngân hàng",
  manual: "Chuyển khoản ngân hàng",
  usdt: "USDT (TRC20)",
};
