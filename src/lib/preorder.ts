import { prisma } from "@/lib/prisma";
import { finalizeOrderCommission } from "@/lib/commission";
import { logOrderStatusChange, type OrderStatusActor } from "@/lib/order-status-history";
import { purgeServiceIntakeSecrets } from "@/lib/service-intake";

// HOÀN TOÀN BỘ 1 OrderItem đặt trước CHƯA ĐƯỢC GIAO — dùng chung cho 2 lối
// vào: buyer tự huỷ (POST /api/orders/[orderItemId]/cancel-preorder) và quét
// tự động quá hạn giao (POST /api/admin/preorders/refund-overdue). Gộp về 1
// chỗ để logic tiền không bị lệch giữa 2 lối vào — cùng pattern
// fullRefundDispute() trong src/lib/disputes.ts.
//
// Gate NGUYÊN TỬ trên chính lệnh UPDATE (status ESCROW -> CANCELLED, ĐỒNG
// THỜI isPreOrder=true VÀ deliveredPayload IS NULL) — chặn đúng 2 race quan
// trọng, cả hai chỉ cần đúng 1 lệnh UPDATE này vì Postgres khoá dòng ngay
// lúc đánh giá WHERE:
//   1. Seller vừa giao đúng lúc buyer bấm huỷ / job quét chạy tới —
//      deliveredPayload đã khác null nên WHERE không khớp, count=0, KHÔNG
//      hoàn tiền (seller thắng).
//   2. Job quét chạy 2 lần (không có cron thật, admin có thể bấm lại nhiều
//      lần) — lần 2 status đã là CANCELLED, WHERE không khớp, count=0 —
//      IDEMPOTENT, không hoàn 2 lần.
//
// Trả { done:false } nếu không hoàn được (đã bị xử lý bởi nhánh khác) —
// caller tự quyết định phản hồi phù hợp (seller đã giao rồi / đã huỷ rồi).
export async function refundPreOrderItem(
  orderItemId: string,
  actor: OrderStatusActor,
  note: string
): Promise<{ done: boolean; amount: number; orderId: string; productName: string } | null> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { buyerId: true } } },
  });
  if (!item) return null;
  const amount = item.price * item.quantity;

  const done = await prisma.$transaction(async (tx) => {
    const gate = await tx.orderItem.updateMany({
      where: { id: orderItemId, status: "ESCROW", isPreOrder: true, deliveredPayload: null },
      data: { status: "CANCELLED" },
    });
    if (gate.count === 0) return false;

    await logOrderStatusChange(tx, {
      orderItemId,
      fromStatus: "ESCROW",
      toStatus: "CANCELLED",
      actor,
      note,
    });
    // Đơn rời ESCROW an toàn — xoá cứng field nhạy cảm dịch vụ nếu có (no-op
    // cho đơn không phải dịch vụ, đặt trước hầu như luôn là PRODUCT/TOOL/TUT).
    await purgeServiceIntakeSecrets(tx, orderItemId);

    await tx.user.update({
      where: { id: item.order.buyerId },
      data: { walletBalance: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: item.order.buyerId,
        type: "REFUND",
        amount,
        status: "CONFIRMED",
        note: `Hoàn tiền đặt trước — ${note} — đơn #${item.orderId} — ${item.productName}`,
        confirmedAt: new Date(),
        orderId: item.orderId,
        orderItemId: item.id,
      },
    });
    return true;
  });

  if (!done) return { done: false, amount, orderId: item.orderId, productName: item.productName };

  const remaining = await prisma.orderItem.count({
    where: { orderId: item.orderId, status: { not: "RELEASED" } },
  });
  if (remaining === 0) {
    await prisma.order.update({ where: { id: item.orderId }, data: { status: "RELEASED" } });
  }
  // Đơn có thể đã settle xong sau khi huỷ item này -> chốt lại hoa hồng.
  await prisma.$transaction((tx) => finalizeOrderCommission(tx, item.orderId));

  return { done: true, amount, orderId: item.orderId, productName: item.productName };
}
