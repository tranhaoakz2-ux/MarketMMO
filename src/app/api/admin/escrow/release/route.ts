import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { finalizeOrderCommission, marginFeeOf } from "@/lib/commission";

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

    // Chỉ đơn CÓ giới thiệu (có ReferralCommission active) mới bị sàn thu phí
    // margin — seller nhận (giá trị item − phí). Phần phí giữ lại làm nguồn trả
    // hoa hồng (thu phí thật, xem mô hình đã chốt). Đơn không giới thiệu: seller
    // nhận 100% như cũ (không đụng).
    const commission = await prisma.referralCommission.findUnique({
      where: { orderId: item.orderId },
      select: { status: true, marginPercentApplied: true },
    });
    const itemValue = item.price * item.quantity;
    const takeFee =
      commission && (commission.status === "PENDING" || commission.status === "ELIGIBLE");
    const platformFee = takeFee ? marginFeeOf(itemValue, commission!.marginPercentApplied) : 0;
    const sellerCredit = itemValue - platformFee;

    // Gate NGUYÊN TỬ trên từng OrderItem (bug B6): chỉ khi chuyển được
    // ESCROW→RELEASED (count===1) mới cộng ví seller.
    const paid = await prisma.$transaction(async (t) => {
      const gate = await t.orderItem.updateMany({
        where: { id: item.id, status: "ESCROW" },
        data: { status: "RELEASED" },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: seller.userId },
        data: { walletBalance: { increment: sellerCredit } },
      });
      await t.walletTransaction.create({
        data: {
          userId: seller.userId,
          type: "PAYOUT",
          amount: sellerCredit,
          status: "CONFIRMED",
          note:
            platformFee > 0
              ? `Giải ngân đơn #${item.orderId} — ${item.productName} (đã trừ phí sàn ${platformFee}đ)`
              : `Giải ngân đơn hàng #${item.orderId} — ${item.productName}`,
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
    // Chốt hoa hồng khi đơn đã settle xong (PENDING→ELIGIBLE/CANCELLED).
    await prisma.$transaction((t) => finalizeOrderCommission(t, item.orderId));
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
