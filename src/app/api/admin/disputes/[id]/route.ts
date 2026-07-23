import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { finalizeOrderCommission } from "@/lib/commission";
import { fullRefundDispute } from "@/lib/disputes";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
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
  // Admin chỉ xử khiếu nại đã escalate lên sàn (phase PLATFORM). Khiếu nại đang
  // ở pha bảo hành seller do seller/ buyer tự xử — SECURITY_AUDIT #8 Phần B.
  if (dispute.phase !== "PLATFORM") {
    return NextResponse.json(
      { error: "Khiếu nại đang trong giai đoạn bảo hành với người bán, chưa được đưa lên sàn." },
      { status: 400 }
    );
  }

  const item = dispute.orderItem;
  const amount = item.price * item.quantity;

  // ── HOÀN TOÀN BỘ: hàng sai/không dùng được. Buyer +100%, seller +0, sàn +0
  // (đơn huỷ, không thu phí). Kho đã giao bị ĐỐT (SOLD→BURNED, không bán lại vì
  // content đã lộ). OrderItem→CANCELLED (UI ẩn nút xem content — quyết định a).
  // Dùng chung helper fullRefundDispute() với luồng seller tự bảo hành (Phần B).
  if (action === "refund_buyer") {
    const result = await fullRefundDispute(id, { adminNote });
    if (!result || !result.done) {
      return NextResponse.json({ error: "Khiếu nại này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Hoàn toàn bộ khiếu nại cho buyer",
      targetType: "Dispute",
      targetId: id,
      detail: `${amount}đ — ${item.productName} (đốt kho đã giao)`,
    });
    return NextResponse.json({ ok: true });
  }

  // ── HOÀN MỘT PHẦN R%: hàng dùng được nhưng trục trặc. Buyer +R%, seller giữ
  // phần còn lại TRỪ phí sàn theo tỉ lệ (quyết định d), sàn thu phí theo tỉ lệ.
  // Kho GIỮ SOLD (đã giao hợp lệ), buyer VẪN xem được content. OrderItem→RELEASED.
  if (action === "partial_refund") {
    const refundPercent = Number(body?.refundPercent);
    if (!Number.isInteger(refundPercent) || refundPercent < 1 || refundPercent > 99) {
      return NextResponse.json(
        { error: "Tỉ lệ hoàn phải là số nguyên từ 1 đến 99 (%)." },
        { status: 400 }
      );
    }
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id: item.sellerId } });
    const buyerRefund = Math.round((amount * refundPercent) / 100);
    const sellerKept = amount - buyerRefund;
    // Phí sàn (đã freeze trên full amount) scale theo phần seller thực giữ.
    const feeProp = amount > 0 ? Math.round((item.platformFeeAmount * sellerKept) / amount) : 0;
    const sellerCredit = sellerKept - feeProp;
    const order = await prisma.order.findUniqueOrThrow({ where: { id: item.orderId } });

    const done = await prisma.$transaction(async (t) => {
      const gate = await t.dispute.updateMany({
        where: { id, status: "OPEN" },
        data: {
          status: "RESOLVED_PARTIAL",
          adminNote,
          refundAmount: buyerRefund,
          resolvedAt: new Date(),
        },
      });
      if (gate.count === 0) return false;
      await t.orderItem.update({ where: { id: item.id }, data: { status: "RELEASED" } });
      // Hoàn phần cho buyer.
      await t.user.update({
        where: { id: order.buyerId },
        data: { walletBalance: { increment: buyerRefund } },
      });
      await t.walletTransaction.create({
        data: {
          userId: order.buyerId,
          type: "REFUND",
          amount: buyerRefund,
          status: "CONFIRMED",
          note: `Hoàn một phần (${refundPercent}%) khiếu nại đơn #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      });
      // Giải ngân phần seller giữ (đã trừ phí sàn theo tỉ lệ).
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
            feeProp > 0
              ? `Giải ngân phần còn lại sau hoàn ${refundPercent}% đơn #${item.orderId} — ${item.productName} (đã trừ phí sàn ${feeProp}đ)`
              : `Giải ngân phần còn lại sau hoàn ${refundPercent}% đơn #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      });
      return true;
    });
    if (!done) {
      return NextResponse.json({ error: "Khiếu nại này đã được xử lý." }, { status: 400 });
    }

    const remaining = await prisma.orderItem.count({
      where: { orderId: item.orderId, status: { not: "RELEASED" } },
    });
    if (remaining === 0) {
      await prisma.order.update({ where: { id: item.orderId }, data: { status: "RELEASED" } });
    }
    await prisma.$transaction((t) => finalizeOrderCommission(t, item.orderId));
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Hoàn một phần khiếu nại",
      targetType: "Dispute",
      targetId: id,
      detail: `Hoàn ${refundPercent}% (${buyerRefund}đ) cho buyer, giải ngân ${sellerCredit}đ cho seller — ${item.productName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "release_seller") {
    const seller = await prisma.seller.findUniqueOrThrow({ where: { id: item.sellerId } });
    // Phí sàn ĐÃ FREEZE trên OrderItem (áp cho mọi đơn) — nhất quán escrow release.
    const platformFee = item.platformFeeAmount;
    const sellerCredit = amount - platformFee;
    // Gate NGUYÊN TỬ trên trạng thái khiếu nại (bug B6): chỉ khi chuyển được
    // OPEN→RESOLVED_RELEASE (count===1) mới giải ngân — chặn giải ngân 2 lần.
    const done = await prisma.$transaction(async (t) => {
      const gate = await t.dispute.updateMany({
        where: { id, status: "OPEN" },
        data: { status: "RESOLVED_RELEASE", adminNote, refundAmount: 0, resolvedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.orderItem.update({ where: { id: item.id }, data: { status: "RELEASED" } });
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
              ? `Giải ngân sau khiếu nại đơn #${item.orderId} — ${item.productName} (đã trừ phí sàn ${platformFee}đ)`
              : `Giải ngân sau khiếu nại đơn #${item.orderId} — ${item.productName}`,
          confirmedAt: new Date(),
        },
      });
      return true;
    });
    if (!done) {
      return NextResponse.json({ error: "Khiếu nại này đã được xử lý." }, { status: 400 });
    }

    const remaining = await prisma.orderItem.count({
      where: { orderId: item.orderId, status: { not: "RELEASED" } },
    });
    if (remaining === 0) {
      await prisma.order.update({ where: { id: item.orderId }, data: { status: "RELEASED" } });
    }
    await prisma.$transaction((t) => finalizeOrderCommission(t, item.orderId));
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Giải ngân khiếu nại cho seller",
      targetType: "Dispute",
      targetId: id,
      detail: `${amount}đ — ${item.productName}`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
