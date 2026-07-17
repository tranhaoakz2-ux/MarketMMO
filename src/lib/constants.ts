export type Role = "BUYER" | "SELLER" | "ADMIN";

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

export type DisputeStatus = "OPEN" | "RESOLVED_REFUND" | "RESOLVED_RELEASE";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

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
export type StockItemStatus = "AVAILABLE" | "SOLD";

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

// Hoa hồng affiliate: tính theo % giá trị MỖI đơn hàng mà người được mời mua
// (áp dụng liên tục, không chỉ đơn đầu tiên), cộng thẳng vào ví người giới
// thiệu ngay khi đơn được tạo — miễn người được mời đã từng NẠP TIỀN thật
// (>=1 WalletTransaction DEPOSIT CONFIRMED) để tránh lạm dụng bằng số dư ảo.
// Kiểm tra trong POST /api/checkout, không phải lúc đăng ký.
// TODO: đây là giá trị % tạm thời (placeholder) — sẽ được cập nhật sau.
export const REFERRAL_COMMISSION_PERCENT = 0.1;

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
  RESOLVED_REFUND: "Đã hoàn tiền người mua",
  RESOLVED_RELEASE: "Đã giải ngân người bán",
};

export const verificationStatusLabel: Record<VerificationStatus, string> = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã xác thực",
  REJECTED: "Bị từ chối",
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
