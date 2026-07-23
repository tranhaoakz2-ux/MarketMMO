import { prisma } from "@/lib/prisma";
import { finalizeOrderCommission } from "@/lib/commission";

// HOÀN TOÀN BỘ 1 khiếu nại — DÙNG CHUNG cho admin (POST /api/admin/disputes/[id]
// action refund_buyer) và seller tự bảo hành (POST /api/seller/disputes/[id]
// action refund). Gộp về 1 chỗ để logic tiền/kho không bị lệch giữa 2 lối vào.
//
// Ngữ nghĩa (SECURITY_AUDIT #8): buyer nhận 100%, đơn vị kho đã giao bị ĐỐT
// (SOLD→BURNED, không bán lại vì content đã lộ), OrderItem→CANCELLED (UI ẩn nút
// xem content). Gate NGUYÊN TỬ OPEN→RESOLVED_REFUND để chặn xử 2 lần / đua.
//
// Trả { done:false } nếu dispute không còn OPEN (đã bị nhánh khác xử) — caller
// tự trả lỗi phù hợp. KHÔNG kiểm quyền/pha ở đây (mỗi route tự guard trước khi
// gọi: admin chỉ gọi cho phase PLATFORM, seller chỉ cho SELLER_WARRANTY của mình).
export async function fullRefundDispute(
  disputeId: string,
  opts: { adminNote?: string | null } = {}
): Promise<{ done: boolean; amount: number; orderId: string; productName: string } | null> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { orderItem: true },
  });
  if (!dispute) return null;
  const item = dispute.orderItem;
  const amount = item.price * item.quantity;
  const order = await prisma.order.findUniqueOrThrow({ where: { id: item.orderId } });

  const done = await prisma.$transaction(async (t) => {
    const gate = await t.dispute.updateMany({
      where: { id: disputeId, status: "OPEN" },
      data: {
        status: "RESOLVED_REFUND",
        adminNote: opts.adminNote ?? null,
        refundAmount: amount,
        resolvedAt: new Date(),
      },
    });
    if (gate.count === 0) return false;
    await t.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED" } });
    // Đốt kho đã giao cho đúng đơn này: SOLD→BURNED (không quay về AVAILABLE).
    await t.productStockItem.updateMany({
      where: { orderItemId: item.id, status: "SOLD" },
      data: { status: "BURNED" },
    });
    await t.user.update({
      where: { id: order.buyerId },
      data: { walletBalance: { increment: amount } },
    });
    await t.walletTransaction.create({
      data: {
        userId: order.buyerId,
        type: "REFUND",
        amount,
        status: "CONFIRMED",
        note: `Hoàn toàn bộ khiếu nại đơn #${item.orderId} — ${item.productName}`,
        confirmedAt: new Date(),
      },
    });
    return true;
  });

  if (done) {
    // Đơn có thể đã settle xong sau khi huỷ item này → chốt lại hoa hồng.
    await prisma.$transaction((t) => finalizeOrderCommission(t, item.orderId));
  }
  return { done, amount, orderId: item.orderId, productName: item.productName };
}
