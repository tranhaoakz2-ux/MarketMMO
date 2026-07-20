import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const dueItems = await prisma.orderItem.findMany({
    where: { status: "ESCROW", escrowReleaseAt: { lte: new Date() } },
    include: { order: true },
  });

  let released = 0;
  for (const item of dueItems) {
    const seller = await prisma.seller.findUnique({ where: { id: item.sellerId } });
    if (!seller) continue;

    // Gate NGUYÊN TỬ trên từng OrderItem (bug B6): chỉ khi chuyển được
    // ESCROW→RELEASED (count===1) mới cộng ví seller — chặn 2 lần chạy giải
    // ngân song song (double-click / cron chồng nhau) trả tiền 2 lần cho cùng
    // 1 mục đơn hàng.
    const paid = await prisma.$transaction(async (t) => {
      const gate = await t.orderItem.updateMany({
        where: { id: item.id, status: "ESCROW" },
        data: { status: "RELEASED" },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: seller.userId },
        data: { walletBalance: { increment: item.price * item.quantity } },
      });
      await t.walletTransaction.create({
        data: {
          userId: seller.userId,
          type: "PAYOUT",
          amount: item.price * item.quantity,
          status: "CONFIRMED",
          note: `Giải ngân đơn hàng #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      });
      return true;
    });
    if (!paid) continue;
    released++;

    const remaining = await prisma.orderItem.count({
      where: { orderId: item.orderId, status: { not: "RELEASED" } },
    });
    if (remaining === 0) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: "RELEASED" },
      });
    }
  }

  if (released > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Chạy giải ngân ký quỹ",
      targetType: "OrderItem",
      detail: `Đã giải ngân ${released} mục đơn hàng`,
    });
  }

  return NextResponse.json({ released });
}
