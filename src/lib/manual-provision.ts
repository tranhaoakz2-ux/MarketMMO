import { prisma } from "@/lib/prisma";
import { finalizeOrderCommission } from "@/lib/commission";
import { logOrderStatusChange, type OrderStatusActor } from "@/lib/order-status-history";
import { purgeServiceIntakeSecrets } from "@/lib/service-intake";

// Giao thủ công theo đơn (VPS/Server, deliveryMethod="MANUAL_PROVISION") —
// xây TÁCH RIÊNG khỏi đặt trước (preorder.ts) theo quyết định đã chốt, dù
// pattern gate nguyên tử giống hệt: 1 lệnh UPDATE vừa là điều kiện vừa là
// hành động, Postgres khoá dòng ngay lúc đánh giá WHERE nên 2 nhánh
// (seller vừa giao / job quét quá hạn) không bao giờ cùng thắng.
//
// HOÀN TOÀN BỘ 1 OrderItem MANUAL_PROVISION mà seller CHƯA nhập credential
// đúng hạn (manualDeliveryDeadline đã qua) — status vẫn "AWAITING_SELLER_DELIVERY"
// (chưa từng chuyển sang ESCROW) nên KHÔNG đụng tới đường giải ngân
// (releaseDueEscrow() chỉ query status="ESCROW", xem src/lib/escrow.ts) —
// seller không nhận được đồng nào cho đơn chưa giao.
export async function refundOverdueManualProvisionItem(
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
      where: { id: orderItemId, status: "AWAITING_SELLER_DELIVERY" },
      data: { status: "CANCELLED" },
    });
    if (gate.count === 0) return false;

    await logOrderStatusChange(tx, {
      orderItemId,
      fromStatus: "AWAITING_SELLER_DELIVERY",
      toStatus: "CANCELLED",
      actor,
      note,
    });
    // No-op cho đơn không phải dịch vụ (MANUAL_PROVISION luôn productType
    // "PRODUCT", không có ServiceIntake) — gọi cho đồng nhất pattern.
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
        note: `Hoàn tiền giao thủ công quá hạn — ${note} — đơn #${item.orderId} — ${item.productName}`,
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
  await prisma.$transaction((tx) => finalizeOrderCommission(tx, item.orderId));

  return { done: true, amount, orderId: item.orderId, productName: item.productName };
}

// Quét TOÀN BỘ đơn MANUAL_PROVISION quá hạn — dùng CHUNG bởi cron
// (GET /api/cron/daily) và nút admin bấm tay
// (POST /api/admin/manual-provision/refund-overdue), tránh viết trùng vòng
// lặp ở 2 nơi. Idempotent — gọi lại nhiều lần an toàn (xem gate nguyên tử ở
// trên).
export async function refundOverdueManualProvisionItems(
  actor: OrderStatusActor
): Promise<{ refunded: number; totalAmount: number }> {
  const now = new Date();
  const overdueItems = await prisma.orderItem.findMany({
    where: { status: "AWAITING_SELLER_DELIVERY", manualDeliveryDeadline: { lte: now } },
    select: { id: true },
  });

  let refunded = 0;
  let totalAmount = 0;
  for (const item of overdueItems) {
    const result = await refundOverdueManualProvisionItem(
      item.id,
      actor,
      "Quá hạn giao thủ công — tự động hoàn tiền"
    );
    if (result?.done) {
      refunded++;
      totalAmount += result.amount;
    }
  }

  return { refunded, totalAmount };
}
