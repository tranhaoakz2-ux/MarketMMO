import type { Prisma } from "@prisma/client";
import {
  ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY,
  POST_RELEASE_WARRANTY_DAYS,
  WARRANTY_UNIT_LABEL,
  type WarrantyUnit,
} from "@/lib/constants";

// Nguồn sự thật DUY NHẤT cho "thời gian bảo hành" — backend (POST /api/disputes,
// POST /api/admin/escrow/release) và frontend (/don-hang) đều gọi qua đây,
// không tự tính lại logic riêng ở từng nơi.

export function toWarrantyHours(value: number, unit: WarrantyUnit): number {
  return unit === "hour" ? value : value * 24;
}

// Nhãn "Bảo hành: X ngày" cho thẻ sản phẩm/trang chi tiết — CÔNG KHAI, dùng
// Product.warrantyValue/warrantyUnit (cấu hình hiện tại của seller, KHÁC
// OrderItem.warrantyHours là snapshot lúc mua của 1 đơn cụ thể).
export function formatProductWarranty(warrantyValue: number, warrantyUnit: WarrantyUnit): string {
  if (warrantyValue <= 0) return "Không bảo hành";
  return `Bảo hành: ${warrantyValue} ${WARRANTY_UNIT_LABEL[warrantyUnit]}`;
}

export type WarrantyOrderItem = {
  // null = đơn TỪ TRƯỚC tính năng này — dùng luật cũ POST_RELEASE_WARRANTY_DAYS
  // kể từ releasedAt làm dự phòng vĩnh viễn (xem ghi chú OrderItem.warrantyHours
  // trong schema.prisma). Số thật (kể cả 0 = bán đứt) = đơn mới, đã snapshot.
  warrantyHours: number | null;
  // Mốc buyer "Xác nhận đã nhận hàng" — null = chưa xác nhận, bảo hành CHƯA
  // bắt đầu tính (KHÔNG fallback sang releasedAt cho đơn mới — chỉ đơn cũ
  // warrantyHours=null mới dùng nhánh dự phòng releasedAt).
  receivedAt: Date | null;
  // = receivedAt + warrantyHours, tính sẵn lúc set receivedAt. Đóng băng,
  // không đổi dù Product.warrantyValue bị sửa sau đó.
  warrantyExpiresAt: Date | null;
  // Chỉ cần cho nhánh dự phòng đơn cũ (warrantyHours null).
  releasedAt: Date | null;
};

// Hạn khiếu nại "bảo hành sau giải ngân" thật sự áp dụng — null nghĩa là
// KHÔNG có cửa sổ nào đang mở (bán đứt/chưa bắt đầu tính/đơn cũ chưa release).
export function getWarrantyDeadline(item: WarrantyOrderItem): Date | null {
  if (item.warrantyHours !== null) {
    // Đơn mới đã snapshot bảo hành lúc mua.
    if (item.warrantyHours <= 0) return null; // bán đứt — không có cửa sổ này
    return item.warrantyExpiresAt; // null nếu buyer chưa "Xác nhận đã nhận hàng"
  }
  // Đơn TỪ TRƯỚC tính năng này — dự phòng vĩnh viễn: luật cũ 7 ngày kể từ
  // releasedAt (xem POST_RELEASE_WARRANTY_DAYS).
  if (!item.releasedAt) return null;
  return new Date(item.releasedAt.getTime() + POST_RELEASE_WARRANTY_DAYS * 24 * 3600_000);
}

export function isWithinWarranty(item: WarrantyOrderItem, now: Date = new Date()): boolean {
  const deadline = getWarrantyDeadline(item);
  return deadline !== null && now <= deadline;
}

export type WarrantyRemaining =
  // Không có cửa sổ bảo hành nào áp dụng (bán đứt, hoặc đơn cũ chưa release).
  | { state: "none" }
  // Sản phẩm có bảo hành nhưng buyer chưa bấm "Xác nhận đã nhận hàng".
  | { state: "not_started" }
  | { state: "active"; deadline: Date; hoursRemaining: number }
  | { state: "expired"; deadline: Date };

export function warrantyRemaining(item: WarrantyOrderItem, now: Date = new Date()): WarrantyRemaining {
  if (item.warrantyHours !== null && item.warrantyHours > 0 && !item.warrantyExpiresAt) {
    return { state: "not_started" };
  }
  const deadline = getWarrantyDeadline(item);
  if (!deadline) return { state: "none" };
  if (now > deadline) return { state: "expired", deadline };
  return { state: "active", deadline, hoursRemaining: (deadline.getTime() - now.getTime()) / 3600_000 };
}

// Hiển thị đếm ngược "Còn X ngày Y giờ bảo hành" — null khi không có gì để
// hiện (state "none"). Giờ/ngày hiển thị là ĐỘ DÀI thời lượng (không phụ
// thuộc múi giờ); mốc hạn cụ thể (deadline) dùng formatWarrantyDeadline bên
// dưới khi cần hiện NGÀY GIỜ thật theo múi giờ Việt Nam.
export function formatWarrantyRemaining(
  remaining: WarrantyRemaining
): { label: string; tone: "danger" | "warn" | "safe" } | null {
  if (remaining.state === "none") return null;
  if (remaining.state === "not_started") {
    return { label: "Bấm \"Xác nhận đã nhận hàng\" để bắt đầu tính bảo hành", tone: "safe" };
  }
  if (remaining.state === "expired") {
    return { label: "Đã hết bảo hành", tone: "danger" };
  }
  const totalHours = Math.max(0, remaining.hoursRemaining);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  const label =
    days > 0 ? `Còn ${days} ngày ${hours} giờ bảo hành` : `Còn ${hours} giờ bảo hành`;
  return { label, tone: totalHours <= 24 ? "warn" : "safe" };
}

// Định dạng 1 mốc thời gian cụ thể theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
// — server (Vercel) chạy UTC, không được để mặc định toLocaleString() dùng
// giờ hệ thống server.
export function formatVnDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

// Giải ngân ký quỹ CÓ ĐỢI hết bảo hành hay không — cờ
// ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY (constants.ts). Không giữ vô thời hạn:
// nếu buyer chưa từng "nhận hàng" (warrantyExpiresAt vẫn null — xem
// markReceivedIfNeeded() bên dưới, mốc này giờ set tự động ngay lúc buyer
// bấm lộ hàng lần đầu, hoặc tự động qua auto-confirm trong
// POST /api/admin/escrow/release nếu buyer không bao giờ bấm), vẫn giải
// ngân theo đúng escrowReleaseAt cũ (lịch ESCROW_HOLD_DAYS mặc định).
export function getEffectiveEscrowReleaseAt(item: {
  escrowReleaseAt: Date;
  warrantyExpiresAt: Date | null;
}): Date {
  if (!ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY) return item.escrowReleaseAt;
  if (!item.warrantyExpiresAt) return item.escrowReleaseAt;
  return item.warrantyExpiresAt > item.escrowReleaseAt ? item.warrantyExpiresAt : item.escrowReleaseAt;
}

export type ReceivableOrderItem = {
  id: string;
  status: string;
  receivedAt: Date | null;
  warrantyHours: number | null;
};

// Đánh dấu buyer "đã nhận hàng" — mốc NEO DUY NHẤT bắt đầu tính "Thời gian
// bảo hành" trên toàn sàn (sản phẩm/dịch vụ/tool/TUT-Trick dùng chung đúng
// 1 hàm này, không tự tính lại logic riêng ở từng nơi). Idempotent (no-op,
// trả về null nếu đã set trước đó) và chỉ set khi status ESCROW/RELEASED —
// KHÔNG set khi CANCELLED/DISPUTED (những trạng thái đó không còn ý nghĩa
// "đã nhận hàng bình thường", khớp luật cũ của route confirm-received đã bỏ).
//
// Dùng ở ĐÚNG 2 nơi:
//   1. POST /api/orders/[orderItemId]/reveal-delivered — buyer bấm lộ hàng
//      LẦN ĐẦU, trong transaction cùng với việc đọc nội dung trả về.
//   2. POST /api/admin/escrow/release — lưới an toàn auto-confirm khi đơn
//      đến hạn giải ngân mà buyer chưa từng bấm lộ hàng (xem điều kiện áp
//      dụng riêng ở đó — cố tình KHÔNG áp dụng cho mọi trường hợp).
export async function markReceivedIfNeeded(
  tx: Prisma.TransactionClient,
  item: ReceivableOrderItem,
  now: Date = new Date()
): Promise<{ receivedAt: Date; warrantyExpiresAt: Date | null } | null> {
  if (item.receivedAt) return null;
  if (item.status !== "ESCROW" && item.status !== "RELEASED") return null;

  const warrantyExpiresAt =
    item.warrantyHours !== null && item.warrantyHours > 0
      ? new Date(now.getTime() + item.warrantyHours * 3600_000)
      : null;

  await tx.orderItem.update({
    where: { id: item.id },
    data: { receivedAt: now, warrantyExpiresAt },
  });

  return { receivedAt: now, warrantyExpiresAt };
}
