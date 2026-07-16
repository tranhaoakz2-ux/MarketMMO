import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.slice(0, 500) : null;

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { orderItem: true },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }
  if (dispute.status !== "OPEN") {
    return NextResponse.json({ error: "Khiếu nại này đã được xử lý." }, { status: 400 });
  }

  const item = dispute.orderItem;
  const amount = item.price * item.quantity;

  if (action === "refund_buyer") {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: item.orderId } });
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED" } }),
      prisma.dispute.update({
        where: { id },
        data: { status: "RESOLVED_REFUND", adminNote, resolvedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: order.buyerId },
        data: { walletBalance: { increment: amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: order.buyerId,
          type: "REFUND",
          amount,
          status: "CONFIRMED",
          note: `Hoàn tiền khiếu nại đơn #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "release_seller") {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id: item.sellerId } });
    await prisma.$transaction([
      prisma.orderItem.update({ where: { id: item.id }, data: { status: "RELEASED" } }),
      prisma.dispute.update({
        where: { id },
        data: { status: "RESOLVED_RELEASE", adminNote, resolvedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: seller.userId },
        data: { walletBalance: { increment: amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: seller.userId,
          type: "PAYOUT",
          amount,
          status: "CONFIRMED",
          note: `Giải ngân sau khiếu nại đơn #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      }),
    ]);

    const remaining = await prisma.orderItem.count({
      where: { orderId: item.orderId, status: { not: "RELEASED" } },
    });
    if (remaining === 0) {
      await prisma.order.update({ where: { id: item.orderId }, data: { status: "RELEASED" } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
