import type { OrderStatus } from "@/lib/constants";
import type { Tone } from "@/components/seller-demo/DemoKit";

// Dữ liệu GIẢ cho các trang demo Quản Lý Bán Hàng (Đợt 1). Không gọi backend.

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  ESCROW: "warn",
  RELEASED: "success",
  CANCELLED: "neutral",
  DISPUTED: "danger",
};

export type DemoOrder = {
  id: string;
  orderId: string;
  productName: string;
  variantLabel: string | null;
  categoryName: string;
  buyerName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  createdAt: string; // hiển thị sẵn
  escrowReleaseAt: string | null;
};

export const PRODUCT_ORDERS: DemoOrder[] = [
  { id: "o1", orderId: "A1B2C3D4", productName: "Gmail US random new, chưa đăng nhập thiết bị nào — bảo hành 7 ngày", variantLabel: "Domain .US - Thuê 24h", categoryName: "Gmail", buyerName: "buyerdemo", quantity: 2, price: 12000, status: "ESCROW", createdAt: "21/07/2026", escrowReleaseAt: "24/07/2026" },
  { id: "o2", orderId: "B2C3D4E5", productName: "Facebook Việt Nam 2FA, cổ 2018", variantLabel: null, categoryName: "Facebook", buyerName: "haovegas222", quantity: 1, price: 39000, status: "RELEASED", createdAt: "19/07/2026", escrowReleaseAt: null },
  { id: "o3", orderId: "C3D4E5F6", productName: "Steam key game AAA random", variantLabel: null, categoryName: "Khác", buyerName: "refflow371", quantity: 3, price: 55000, status: "RELEASED", createdAt: "18/07/2026", escrowReleaseAt: null },
  { id: "o4", orderId: "D4E5F6G7", productName: "Outlook cổ trust, dùng reg tút", variantLabel: "Gói 10 acc", categoryName: "Outlook", buyerName: "cloudhouse", quantity: 1, price: 85000, status: "DISPUTED", createdAt: "17/07/2026", escrowReleaseAt: null },
  { id: "o5", orderId: "E5F6G7H8", productName: "Discord token verify sẵn", variantLabel: null, categoryName: "Discord", buyerName: "aloha99", quantity: 5, price: 15000, status: "CANCELLED", createdAt: "16/07/2026", escrowReleaseAt: null },
  { id: "o6", orderId: "F6G7H8I9", productName: "Gmail cổ 2015-2018 full drive", variantLabel: null, categoryName: "Gmail", buyerName: "minhtu", quantity: 2, price: 28000, status: "ESCROW", createdAt: "22/07/2026", escrowReleaseAt: "25/07/2026" },
];

export const SERVICE_ORDERS: DemoOrder[] = [
  { id: "s1", orderId: "S1A2B3C4", productName: "Cày thuê Liên Quân lên Cao Thủ", variantLabel: "Vàng → Bạch Kim", categoryName: "Boosting", buyerName: "gamerpro", quantity: 1, price: 350000, status: "ESCROW", createdAt: "21/07/2026", escrowReleaseAt: "24/07/2026" },
  { id: "s2", orderId: "S2B3C4D5", productName: "ChatGPT Team cấp sẵn, dùng riêng 1 tháng", variantLabel: null, categoryName: "ChatGPT", buyerName: "startupvn", quantity: 1, price: 220000, status: "RELEASED", createdAt: "18/07/2026", escrowReleaseAt: null },
  { id: "s3", orderId: "S3C4D5E6", productName: "Tăng 1000 sub YouTube thật, giữ 30 ngày", variantLabel: "Gói cơ bản", categoryName: "YouTube", buyerName: "vlogger", quantity: 2, price: 180000, status: "ESCROW", createdAt: "20/07/2026", escrowReleaseAt: "23/07/2026" },
  { id: "s4", orderId: "S4D5E6F7", productName: "Boost rank Valorant lên Diamond", variantLabel: null, categoryName: "Boosting", buyerName: "fpsking", quantity: 1, price: 500000, status: "DISPUTED", createdAt: "15/07/2026", escrowReleaseAt: null },
];

export const PREORDER_ORDERS: DemoOrder[] = [
  { id: "p1", orderId: "P1A2B3C4", productName: "iCloud US chính chủ (đang về hàng)", variantLabel: null, categoryName: "Khác", buyerName: "applefan", quantity: 1, price: 120000, status: "ESCROW", createdAt: "22/07/2026", escrowReleaseAt: "25/07/2026" },
  { id: "p2", orderId: "P2B3C4D5", productName: "TikTok kênh 10k follow (order theo yêu cầu)", variantLabel: "10k follow VN", categoryName: "TikTok", buyerName: "shopmall", quantity: 1, price: 450000, status: "ESCROW", createdAt: "21/07/2026", escrowReleaseAt: "24/07/2026" },
];

export type DemoProductStatus = "APPROVED" | "PENDING" | "REJECTED";

export type DemoVariant = { id: string; label: string; price: number; stock: number; sold: number };

export type DemoProduct = {
  id: string;
  name: string;
  categoryLabel: string;
  status: DemoProductStatus;
  adminNote?: string;
  price: number;
  stock: number;
  sold: number;
  stockManaged: boolean;
  stockAvailable: number;
  preOrder: boolean;
  variants: DemoVariant[];
};

export const PRODUCT_STATUS_META: Record<DemoProductStatus, { tone: Tone; label: string }> = {
  APPROVED: { tone: "success", label: "Đã duyệt" },
  PENDING: { tone: "warn", label: "Chờ duyệt" },
  REJECTED: { tone: "danger", label: "Bị từ chối" },
};

export const SELLER_PRODUCTS: DemoProduct[] = [
  {
    id: "pr1",
    name: "Gmail US random new, chưa đăng nhập thiết bị nào — bảo hành 7 ngày",
    categoryLabel: "GMAIL",
    status: "APPROVED",
    price: 12000,
    stock: 214,
    sold: 1032,
    stockManaged: true,
    stockAvailable: 214,
    preOrder: false,
    variants: [
      { id: "v1", label: "Domain .US - Thuê 24h - Tên Việt", price: 12000, stock: 120, sold: 640 },
      { id: "v2", label: "Domain .Com - Thuê 24h", price: 9000, stock: 94, sold: 392 },
    ],
  },
  {
    id: "pr2",
    name: "Facebook Việt Nam 2FA, cổ 2018, dễ đổi thông tin",
    categoryLabel: "FACEBOOK",
    status: "APPROVED",
    price: 39000,
    stock: 42,
    sold: 318,
    stockManaged: true,
    stockAvailable: 2,
    preOrder: false,
    variants: [],
  },
  {
    id: "pr3",
    name: "ChatGPT Team cấp sẵn, dùng riêng 1 tháng",
    categoryLabel: "CHATGPT",
    status: "PENDING",
    price: 220000,
    stock: 10,
    sold: 0,
    stockManaged: false,
    stockAvailable: 0,
    preOrder: false,
    variants: [],
  },
  {
    id: "pr4",
    name: "Discord Nitro 1 tháng full boost",
    categoryLabel: "DISCORD",
    status: "REJECTED",
    adminNote: "Ảnh sản phẩm chưa rõ, vui lòng đăng lại với mô tả nguồn gốc.",
    price: 85000,
    stock: 0,
    sold: 74,
    stockManaged: false,
    stockAvailable: 0,
    preOrder: true,
    variants: [],
  },
];

// ---- Đợt 2: Mã giảm giá / Rút tiền / Đấu giá ----

export type DemoDiscountCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export const DISCOUNT_CODES: DemoDiscountCode[] = [
  { id: "d1", code: "SALE20", type: "PERCENT", value: 20, maxUses: 100, usedCount: 42, active: true, expiresAt: "31/08/2026" },
  { id: "d2", code: "GIAM10K", type: "FIXED", value: 10000, maxUses: null, usedCount: 218, active: true, expiresAt: null },
  { id: "d3", code: "HELLO2026", type: "PERCENT", value: 15, maxUses: 50, usedCount: 50, active: false, expiresAt: "01/07/2026" },
];

export type DemoWithdrawal = {
  id: string;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  bank: string;
  createdAt: string;
};

export const WITHDRAWALS: DemoWithdrawal[] = [
  { id: "w1", amount: 500000, status: "PENDING", bank: "Vietcombank · 0123xxxx", createdAt: "22/07/2026 09:14" },
  { id: "w2", amount: 1000000, status: "CONFIRMED", bank: "Techcombank · 1902xxxx", createdAt: "18/07/2026 15:40" },
  { id: "w3", amount: 200000, status: "REJECTED", bank: "MB Bank · 8888xxxx", createdAt: "12/07/2026 11:02" },
];

export type DemoAuctionSlot = {
  id: string;
  position: number;
  period: "WEEKLY" | "DAILY";
  floorPrice: number;
  countdown: string;
  topBid: { amount: number; productName: string; sellerName: string } | null;
  bidCount: number;
};

export const AUCTION_SLOTS: DemoAuctionSlot[] = [
  { id: "a1", position: 1, period: "WEEKLY", floorPrice: 500000, countdown: "2 ngày 04:12", topBid: { amount: 1200000, productName: "Gmail US random new", sellerName: "AccVerse" }, bidCount: 7 },
  { id: "a2", position: 2, period: "WEEKLY", floorPrice: 500000, countdown: "2 ngày 04:12", topBid: { amount: 850000, productName: "Facebook Việt Nam 2FA", sellerName: "ProAccounts" }, bidCount: 3 },
  { id: "a3", position: 3, period: "WEEKLY", floorPrice: 500000, countdown: "2 ngày 04:12", topBid: null, bidCount: 0 },
  { id: "a4", position: 4, period: "WEEKLY", floorPrice: 500000, countdown: "2 ngày 04:12", topBid: null, bidCount: 0 },
  { id: "a5", position: 5, period: "DAILY", floorPrice: 150000, countdown: "03:47:20", topBid: { amount: 320000, productName: "ChatGPT Team cấp sẵn", sellerName: "CloudHouse" }, bidCount: 5 },
  { id: "a6", position: 6, period: "DAILY", floorPrice: 150000, countdown: "03:47:20", topBid: null, bidCount: 0 },
];

// Sản phẩm để chọn khi đặt giá đấu (rút gọn từ SELLER_PRODUCTS).
export const MY_PRODUCT_OPTIONS = SELLER_PRODUCTS.filter((p) => p.status === "APPROVED").map((p) => ({
  id: p.id,
  name: p.name,
}));

// ---- Đợt 3: Khiếu nại / Quỹ bảo hiểm / Đánh giá ----

export type DemoDisputeStatus =
  | "OPEN"
  | "RESOLVED_REFUND"
  | "RESOLVED_PARTIAL"
  | "RESOLVED_RELEASE";

export type DemoDispute = {
  id: string;
  productName: string;
  buyerName: string;
  amount: number;
  reason: string;
  status: DemoDisputeStatus;
  phase: "SELLER_WARRANTY" | "PLATFORM";
  warrantyDeadline: string | null; // còn lại (hiển thị)
  warrantyRejected: boolean;
  createdAt: string;
  resolvedAt: string | null;
  refundAmount?: number;
};

export const DISPUTES: DemoDispute[] = [
  { id: "dp1", productName: "Gmail US random new, chưa đăng nhập thiết bị", buyerName: "buyerdemo", amount: 24000, reason: "Tài khoản đăng nhập báo sai mật khẩu, không vào được.", status: "OPEN", phase: "SELLER_WARRANTY", warrantyDeadline: "còn 18 giờ", warrantyRejected: false, createdAt: "23/07/2026 08:20", resolvedAt: null },
  { id: "dp2", productName: "Facebook Việt Nam 2FA, cổ 2018", buyerName: "haovegas222", amount: 39000, reason: "Acc bị checkpoint ngay sau khi nhận, không mở được.", status: "OPEN", phase: "SELLER_WARRANTY", warrantyDeadline: "hết hạn", warrantyRejected: true, createdAt: "22/07/2026 14:10", resolvedAt: null },
  { id: "dp3", productName: "Outlook cổ trust, dùng reg tút", buyerName: "cloudhouse", amount: 85000, reason: "Giao thiếu 1 tài khoản so với đơn.", status: "OPEN", phase: "PLATFORM", warrantyDeadline: null, warrantyRejected: true, createdAt: "21/07/2026 09:00", resolvedAt: null },
  { id: "dp4", productName: "Discord token verify sẵn", buyerName: "aloha99", amount: 45000, reason: "Token die toàn bộ, không dùng được.", status: "RESOLVED_REFUND", phase: "PLATFORM", warrantyDeadline: null, warrantyRejected: true, createdAt: "18/07/2026", resolvedAt: "19/07/2026", refundAmount: 45000 },
  { id: "dp5", productName: "Steam key game AAA random", buyerName: "refflow371", amount: 165000, reason: "1/3 key trùng, đã kích hoạt lỗi.", status: "RESOLVED_PARTIAL", phase: "PLATFORM", warrantyDeadline: null, warrantyRejected: false, createdAt: "16/07/2026", resolvedAt: "17/07/2026", refundAmount: 55000 },
  { id: "dp6", productName: "Gmail cổ 2015-2018 full drive", buyerName: "minhtu", amount: 56000, reason: "Đổi ý không muốn mua nữa.", status: "RESOLVED_RELEASE", phase: "PLATFORM", warrantyDeadline: null, warrantyRejected: false, createdAt: "14/07/2026", resolvedAt: "15/07/2026" },
];

export const DISPUTE_STATUS_META: Record<string, { tone: Tone; label: string }> = {
  WARRANTY: { tone: "warn", label: "Chờ bạn bảo hành" },
  PLATFORM: { tone: "info", label: "Đang chờ sàn" },
  RESOLVED_REFUND: { tone: "danger", label: "Đã hoàn toàn bộ" },
  RESOLVED_PARTIAL: { tone: "info", label: "Đã hoàn một phần" },
  RESOLVED_RELEASE: { tone: "success", label: "Đã giải ngân bạn" },
};

export type DemoInsuranceDeposit = { id: string; amount: number; createdAt: string };

export const INSURANCE_HISTORY: DemoInsuranceDeposit[] = [
  { id: "in1", amount: 100000, createdAt: "20/07/2026 10:12" },
  { id: "in2", amount: 100000, createdAt: "10/07/2026 16:30" },
  { id: "in3", amount: 50000, createdAt: "01/07/2026 09:05" },
];
export const INSURANCE_BALANCE = 250000;

export type DemoReview = { id: string; authorName: string; rating: number; comment: string; createdAt: string };

export const REVIEWS: DemoReview[] = [
  { id: "rv1", authorName: "buyerdemo", rating: 5, comment: "Shop giao nhanh, acc chuẩn, bảo hành nhiệt tình. Sẽ ủng hộ tiếp!", createdAt: "22/07/2026" },
  { id: "rv2", authorName: "haovegas222", rating: 4, comment: "Hàng ổn, có 1 acc lỗi nhẹ nhưng shop đổi ngay.", createdAt: "20/07/2026" },
  { id: "rv3", authorName: "refflow371", rating: 5, comment: "Giá tốt, giao tự động 24/7 quá tiện.", createdAt: "18/07/2026" },
  { id: "rv4", authorName: "cloudhouse", rating: 3, comment: "Chất lượng ok nhưng phản hồi hơi chậm lúc đông đơn.", createdAt: "15/07/2026" },
  { id: "rv5", authorName: "minhtu", rating: 5, comment: "Uy tín, đã mua nhiều lần không lỗi lần nào.", createdAt: "12/07/2026" },
];

// Tin nhắn mẫu buyer↔seller cho từng khiếu nại (demo). Khi lên trang thật sẽ
// nối vào hệ chat có sẵn (Conversation/Message) — xem ghi chú tích hợp.
export type DemoChatMsg = { from: "seller" | "buyer"; text: string; time: string };

export const DISPUTE_CHATS: Record<string, DemoChatMsg[]> = {
  dp1: [
    { from: "buyer", text: "Shop ơi acc Gmail vừa mua đăng nhập báo sai mật khẩu ạ.", time: "08:22" },
    { from: "seller", text: "Bạn thử đăng nhập bằng trình duyệt ẩn danh giúp mình nhé, kèm mã 2FA ở dòng cuối.", time: "08:25" },
    { from: "buyer", text: "Mình thử rồi vẫn không vào được, có ảnh chụp lỗi đây.", time: "08:31" },
    { from: "seller", text: "Ok để mình kiểm tra lại lô này, nếu lỗi thật mình đổi acc mới cho bạn ngay.", time: "08:34" },
  ],
  dp2: [
    { from: "buyer", text: "Acc FB bị checkpoint ngay khi nhận, không mở được luôn.", time: "14:12" },
    { from: "seller", text: "Bạn gửi mình mã checkpoint hiển thị để mình hỗ trợ mở khoá nhé.", time: "14:20" },
    { from: "buyer", text: "Nó bắt xác minh danh tính luôn rồi, mình không có giấy tờ acc này.", time: "14:28" },
  ],
};
