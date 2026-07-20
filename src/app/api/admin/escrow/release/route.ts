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

    await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: item.id },
        data: { status: "RELEASED" },
      }),
      prisma.user.update({
        where: { id: seller.userId },
        data: { walletBalance: { increment: item.price * item.quantity } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: seller.userId,
          type: "PAYOUT",
          amount: item.price * item.quantity,
          status: "CONFIRMED",
          note: `Giải ngân đơn hàng #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      }),
    ]);
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
