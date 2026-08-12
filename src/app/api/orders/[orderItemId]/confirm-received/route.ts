import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Buyer xác nhận ĐÃ NHẬN HÀNG — mốc NEO bắt đầu tính "Thời gian bảo hành"
// (khác OrderItem "Nhận đơn" ở phía SELLER cho dịch vụ — đó là seller chấp
// nhận thực hiện dịch vụ buyer yêu cầu, hoàn toàn khác actor/ý nghĩa, xem
// POST /api/seller/orders/[id]/accept). Đặt tên riêng "confirm-received" để
// không trùng route/khái niệm.
//
// Chỉ set 1 LẦN (idempotent - từ chối nếu đã set), chỉ cho phép khi đơn
// đang ESCROW hoặc RELEASED (không cho xác nhận khi đã CANCELLED/DISPUTED —
// những trạng thái đó không còn ý nghĩa "đã nhận hàng bình thường").
// warrantyExpiresAt tính SẴN ngay tại đây (đóng băng, không đổi dù seller
// sửa lại Product.warrantyValue sau này) — cùng nguyên tắc
// ServiceIntake.sensitiveRevealDeadline.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      status: true,
      receivedAt: true,
      warrantyHours: true,
      order: { select: { buyerId: true } },
    },
  });

  // 404 chung cho "không tồn tại" lẫn "không phải đơn của buyer này" — tránh
  // lộ thông tin đơn hàng người khác qua khác biệt lỗi.
  if (!item || item.order.buyerId !== session!.user.id) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }
  if (item.status !== "ESCROW" && item.status !== "RELEASED") {
    return NextResponse.json(
      { error: "Đơn hàng này không ở trạng thái có thể xác nhận đã nhận hàng." },
      { status: 400 }
    );
  }
  if (item.receivedAt) {
    return NextResponse.json({ error: "Đơn hàng này đã được xác nhận nhận hàng trước đó." }, { status: 400 });
  }

  const now = new Date();
  // warrantyHours null = đơn TỪ TRƯỚC tính năng bảo hành — vẫn cho buyer xác
  // nhận nhận hàng (để không chặn 1 hành động vô hại), nhưng KHÔNG có gì để
  // tính hạn từ mốc này (đơn đó tiếp tục dùng luật cũ POST_RELEASE_WARRANTY_DAYS
  // kể từ releasedAt — xem src/lib/warranty.ts). warrantyHours=0 (bán đứt)
  // cũng không có hạn để tính (đúng thiết kế — không có bảo hành sau giải ngân).
  const warrantyExpiresAt =
    item.warrantyHours !== null && item.warrantyHours > 0
      ? new Date(now.getTime() + item.warrantyHours * 3600_000)
      : null;

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { receivedAt: now, warrantyExpiresAt },
  });

  return NextResponse.json({ ok: true, receivedAt: now, warrantyExpiresAt });
}
