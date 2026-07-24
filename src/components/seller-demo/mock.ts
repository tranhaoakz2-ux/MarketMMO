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
