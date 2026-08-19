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
  | "INSURANCE_DEPOSIT"
  | "INSURANCE_PAYOUT"
  // Tiền bị KHOÁ khỏi walletBalance lúc seller đặt/nâng giá đấu vị trí vàng
  // (status PENDING trong lúc còn khoá) — xem model AuctionBid. Khi admin
  // duyệt thắng, CHÍNH dòng này đổi type → "PURCHASE" (không tạo dòng mới,
  // không trừ ví thêm lần nữa vì đã trừ từ lúc khoá). Khi rớt hạng/bị nâng
  // giá đè/admin từ chối, status đổi PENDING → REJECTED + hoàn lại ví.
  | "AUCTION_HOLD";

export type WalletTxStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type DisputeStatus =
  | "OPEN"
  | "RESOLVED_REFUND"
  | "RESOLVED_PARTIAL"
  | "RESOLVED_RELEASE"
  // Đền bù buyer từ quỹ bảo hiểm của seller — CHỈ dùng cho khiếu nại phase
  // POST_RELEASE_WARRANTY (đơn đã giải ngân, escrow không còn để hoàn). Tách
  // riêng khỏi RESOLVED_REFUND để audit biết rõ tiền hoàn từ escrow hay từ
  // quỹ bảo hiểm — xem POST /api/admin/disputes/[id] action refund_from_insurance.
  | "RESOLVED_INSURANCE";

// Pha xử lý khiếu nại (SECURITY_AUDIT #8 Phần B). Buyer mở khi đơn còn ESCROW
// → SELLER_WARRANTY (seller có WARRANTY_WINDOW_HOURS để tự xử); hết hạn/bị
// từ chối → buyer escalate → PLATFORM (admin xử). Seller tự mở đi thẳng
// PLATFORM. POST_RELEASE_WARRANTY = buyer mở SAU KHI đơn đã RELEASED (tiền
// đã vào ví seller) trong vòng POST_RELEASE_WARRANTY_DAYS kể từ
// OrderItem.releasedAt — đi thẳng admin (seller đã có tiền, không tự bảo
// hành), admin đền bù (nếu duyệt) TỪ QUỹ BẢO HIỂM của seller thay vì escrow
// (đã không còn). Xem POST /api/disputes.
export type DisputePhase = "SELLER_WARRANTY" | "PLATFORM" | "POST_RELEASE_WARRANTY";

// Cửa sổ (giờ) seller được tự bảo hành trước khi buyer escalate lên sàn.
export const WARRANTY_WINDOW_HOURS = 24;

// Cửa sổ (ngày) buyer được mở khiếu nại "bảo hành sau giải ngân" — tính từ
// OrderItem.releasedAt. KHÁC WARRANTY_WINDOW_HOURS (đó là SLA seller tự xử
// khi đơn CÒN escrow, tính bằng giờ). Đơn RELEASED quá lâu (ngoài cửa sổ này)
// không còn mở khiếu nại loại này được nữa.
//
// LƯU Ý (tính năng "Thời gian bảo hành"): kể từ khi OrderItem.warrantyHours
// tồn tại, hằng số CỐ ĐỊNH này chỉ còn là DỰ PHÒNG cho đơn TỪ TRƯỚC tính
// năng đó (warrantyHours = null) — đơn mới dùng warrantyHours snapshot theo
// từng sản phẩm thay vì con số cố định này. Xem src/lib/warranty.ts.
export const POST_RELEASE_WARRANTY_DAYS = 7;

// Đơn vị bảo hành seller khai lúc đăng sản phẩm — String tự do (không enum
// Postgres, theo đúng quy ước dự án).
export type WarrantyUnit = "hour" | "day";

export const WARRANTY_UNIT_LABEL: Record<WarrantyUnit, string> = {
  hour: "giờ",
  day: "ngày",
};

// Ngưỡng bảo hành tối thiểu (giờ) — CHỈ áp cho productType="PRODUCT" (tài
// khoản/dữ liệu bán qua kho thật). Dịch vụ/TUT-Trick/Tool cho phép 0 (bán
// đứt) vì bản chất giao dịch khác (dịch vụ có SLA riêng qua
// WARRANTY_WINDOW_HOURS, TUT-Trick/Tool là nội dung/quy trình không có khái
// niệm "hỏng" theo thời gian sử dụng). Để hằng số ở đây thay vì hardcode rải
// rác — validate ở CẢ API (POST /api/seller/products) lẫn UI (AddProductForm).
export const MIN_WARRANTY_HOURS_PRODUCT = 24;

// Sàn giá/kho hợp lý khi seller đăng sản phẩm/phiên bản — chặn số phi lý
// hoặc vượt phạm vi Int32 của Postgres (2.147.483.647) gây lỗi runtime khi
// ghi DB (PRODUCT_LISTING_AUDIT.md #5). Không phải giới hạn nghiệp vụ cứng,
// chỉ là trần an toàn — seller hợp pháp gần như không bao giờ chạm ngưỡng.
export const MAX_PRODUCT_PRICE_VND = 500_000_000; // 500 triệu đồng
export const MAX_PRODUCT_STOCK = 100_000;

// Chặn spam đăng sản phẩm hàng loạt (PRODUCT_LISTING_AUDIT.md #2) — mỗi
// seller tối đa ngần này lần gọi POST /api/seller/products trong 1 giờ.
// Đủ rộng cho seller đăng nhiều sản phẩm thật trong ngày, đủ hẹp để chặn
// script spam hàng trăm bản ghi PENDING làm ngập hàng chờ duyệt admin.
export const SELLER_PRODUCT_CREATE_LIMIT = 20;
export const SELLER_PRODUCT_CREATE_WINDOW_MS = 60 * 60 * 1000; // 1 giờ

// ── Đặt trước (pre-order) — xây lại 2026-08-14 ──
// Thời gian giao hàng seller CAM KẾT khi bật "Đặt trước" cho 1 sản phẩm
// (Product.preOrderDeliveryValue/Unit) — validate CẢ API
// (PATCH /api/seller/products/[productId]) lẫn UI (SellerPreOrderPanel).
// Trần tối đa để tránh giam tiền buyer trong ký quỹ quá lâu; sàn còn LUÔN
// giữ nguyên hạn cũ nếu seller không sửa lại (không tự rút ngắn hồi tố).
export const MIN_PREORDER_DELIVERY_HOURS = 1;
export const MAX_PREORDER_DELIVERY_HOURS = 30 * 24; // 30 ngày

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

// Cờ bật/tắt: giữ ký quỹ đến hết thời gian bảo hành (thay vì chỉ theo
// escrowReleaseAt cố định ESCROW_HOLD_DAYS) — xem
// getEffectiveEscrowReleaseAt() trong src/lib/warranty.ts, dùng trong
// POST /api/admin/escrow/release. BẬT theo yêu cầu — đơn có bảo hành dài
// hơn ESCROW_HOLD_DAYS sẽ bị giữ tiền lâu hơn lịch giải ngân mặc định.
// Không giữ vô thời hạn: nếu buyer chưa từng "Xác nhận đã nhận hàng"
// (warrantyExpiresAt vẫn null), giải ngân vẫn theo đúng escrowReleaseAt cũ.
export const ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY = true;

// Quên mật khẩu: mã OTP 6 số hết hạn sau ngần này phút kể từ lúc gửi.
export const PASSWORD_RESET_CODE_EXPIRY_MINUTES = 10;
// Nhập sai mã quá số lần này thì mã bị khoá, buộc phải xin mã mới.
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

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

// ── Đấu giá vị trí vàng (xem src/lib/auction.ts + model AuctionSetting/
// AuctionSession/AuctionBid). Hằng dưới CHỈ là giá trị KHỞI TẠO singleton
// lần đầu; admin sửa qua Admin > Đấu giá vị trí vàng > Cài đặt.
export const AUCTION_SETTING_ID = "singleton";
export const DEFAULT_AUCTION_SLOT_COUNT = 6;
export const DEFAULT_AUCTION_FLOOR_PRICE = 50000;

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
  INSURANCE_PAYOUT: "Đền bù từ quỹ bảo hiểm",
  AUCTION_HOLD: "Khoá tiền đấu giá vị trí vàng",
};

// Category nào được coi là "dịch vụ" khi seller xem đơn hàng trong Trang Bán
// Hàng — tái dùng đúng heuristic đã dùng ở NavMegaMenu (mục "Dịch vụ" trên nav
// chính). TỪ KHI CÓ Product.productType (xem mục "Thời hạn sử dụng dịch vụ"),
// đây chỉ còn là FALLBACK cho sản phẩm cũ chưa từng được backfill/gắn field
// definition — getSellerOrderItems() ưu tiên productType, chỉ dùng slug này
// khi productType không đủ tin cậy. Không xoá vì vẫn còn nơi tham chiếu.
export const SERVICE_CATEGORY_SLUGS = ["boosting", "chatgpt", "youtube"];

// ── Dịch vụ: buyer cung cấp thông tin (tài khoản/link/mật khẩu...) cho
// seller thực hiện — xem model ServiceFieldDefinition/ServiceIntake/
// ServiceCredentialAccessLog trong prisma/schema.prisma. ──

// Mã phương thức bàn giao hợp lệ cho Product.serviceDeliveryMethods — seller
// khai TẬP HỢP mã được chấp nhận, buyer chọn 1 trong đó lúc đặt đơn. Sắp xếp
// THEO THỨ TỰ AN TOÀN GIẢM DẦN (UI dùng đúng thứ tự này để gợi ý phương án
// an toàn nhất được phép) — đừng đổi thứ tự khi thêm mã mới.
export const SERVICE_DELIVERY_METHODS = [
  "add_as_admin",
  "app_password",
  "full_credential",
] as const;
export type ServiceDeliveryMethod = (typeof SERVICE_DELIVERY_METHODS)[number];

export const SERVICE_DELIVERY_METHOD_LABEL: Record<ServiceDeliveryMethod, string> = {
  add_as_admin: "Thêm làm quản trị viên/cộng tác viên (an toàn nhất — không cần chia sẻ mật khẩu)",
  app_password: "Mật khẩu ứng dụng/token riêng (thu hồi được, không phải mật khẩu chính)",
  full_credential: "Tài khoản + mật khẩu đầy đủ (rủi ro cao nhất — chỉ dùng khi không còn cách khác)",
};

// Cửa sổ mặc định (giờ) seller được xem field nhạy cảm sau khi "Nhận đơn"
// dịch vụ, áp dụng khi seller bỏ trống Product.credentialViewWindowHours lúc
// đăng dịch vụ. KHÁC WARRANTY_WINDOW_HOURS (đó là SLA xử lý khiếu nại).
export const SERVICE_CREDENTIAL_DEFAULT_WINDOW_HOURS = 48;
export const SERVICE_CREDENTIAL_MIN_WINDOW_HOURS = 1;
export const SERVICE_CREDENTIAL_MAX_WINDOW_HOURS = 168;

// Loại input field seller có thể khai cho 1 dịch vụ — "secret" là NGUỒN DUY
// NHẤT xác định "nhạy cảm" (đi vào ServiceIntake.encryptedFields), các loại
// khác luôn plaintext (ServiceIntake.publicFields). Xem src/lib/service-intake.ts.
export const SERVICE_FIELD_INPUT_TYPES = ["text", "url", "textarea", "secret"] as const;
export type ServiceFieldInputType = (typeof SERVICE_FIELD_INPUT_TYPES)[number];

export const SERVICE_FIELD_INPUT_TYPE_LABEL: Record<ServiceFieldInputType, string> = {
  text: "Văn bản ngắn (vd tài khoản, tên đăng nhập)",
  url: "Đường link (vd trang cá nhân, bài viết mục tiêu)",
  textarea: "Văn bản nhiều dòng (vd ghi chú, yêu cầu)",
  secret: "Bí mật — LUÔN mã hoá (vd mật khẩu, mã OTP/2FA)",
};

// Mức quỹ bảo hiểm gợi ý hiển thị cho seller (KHÔNG bắt buộc, chỉ mang tính
// khuyến khích/tín nhiệm — MarketMMO không chặn tính năng bán hàng như shopmini.pro).
export const INSURANCE_FUND_TARGET = 300000;

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  OPEN: "Đang chờ xử lý",
  RESOLVED_REFUND: "Đã hoàn toàn bộ cho người mua",
  RESOLVED_PARTIAL: "Đã hoàn một phần",
  RESOLVED_RELEASE: "Đã giải ngân người bán",
  RESOLVED_INSURANCE: "Đã đền bù từ quỹ bảo hiểm",
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
  // Method riêng cho RÚT USDT (khác "usdt" ở trên vốn dùng cho NẠP) — tách
  // để không lẫn 2 hướng tiền khi lọc/hiển thị theo method.
  usdt_trc20: "USDT (TRC20)",
  // Đơn nạp ngân hàng ĐÃ được webhook SePay tự động xác nhận (khác "bank" —
  // đơn còn PENDING chờ admin duyệt tay vẫn giữ method "bank" cho tới khi
  // khớp được, xem src/app/api/webhook/sepay/route.ts).
  sepay: "Ngân hàng (SePay tự động)",
};

// Mức rút tiền tối thiểu — dùng cho bank (cùng đơn vị VNĐ); USDT tách
// riêng vì quy đổi qua tỷ giá thị trường, cần mức sàn khác để tránh phí mạng
// TRC20 ăn hết giá trị rút. Validate CẢ API (POST /api/seller/withdraw-request)
// lẫn UI (SellerWithdrawPanel.tsx).
export const MIN_WITHDRAW_AMOUNT = 50000;
export const MIN_USDT_WITHDRAW_AMOUNT = 300000;
