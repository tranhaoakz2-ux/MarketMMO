import { prisma } from "@/lib/prisma";
import { finalizeOrderCommission } from "@/lib/commission";
import { logOrderStatusChange, type OrderStatusActor } from "@/lib/order-status-history";
import { purgeServiceIntakeSecrets } from "@/lib/service-intake";
import { getEffectiveEscrowReleaseAt, markReceivedIfNeeded } from "@/lib/warranty";

// Giải ngân MỌI OrderItem đã đến hạn ký quỹ — tách ra từ
// POST /api/admin/escrow/release để dùng CHUNG với GET /api/cron/daily
// (chạy tự động mỗi ngày, actor SYSTEM) mà không viết trùng logic. Route
// admin gọi với actor ADMIN (kèm logAdminAction riêng ở route đó); cron gọi
// với actor SYSTEM (không có adminId nên không ghi AdminAuditLog — dấu vết
// đã có đủ qua OrderStatusHistory actorType="SYSTEM").
export async function releaseDueEscrow(actor: OrderStatusActor): Promise<{ released: number }> {
  // escrowReleaseAt <= now() là điều kiện CẦN nhưng chưa ĐỦ — thời gian bảo
  // hành (nếu buyer đã "nhận hàng" và hạn đó dài hơn lịch giải ngân mặc định)
  // có thể GIA HẠN thêm việc giữ tiền (ESCROW_HOLD_UNTIL_WARRANTY_EXPIRY, xem
  // getEffectiveEscrowReleaseAt() trong src/lib/warranty.ts) — không bao giờ
  // RÚT NGẮN, chỉ có thể kéo dài, nên lọc thô bằng escrowReleaseAt trước rồi
  // lọc chính xác lại từng dòng bên dưới là an toàn (không bỏ sót).
  const now = new Date();
  const dueItems = await prisma.orderItem.findMany({
    where: { status: "ESCROW", escrowReleaseAt: { lte: now } },
    include: { order: true, product: { select: { productType: true } } },
  });

  let released = 0;
  for (const item of dueItems) {
    // CHẶN RÒ TIỀN ĐẶT TRƯỚC (ưu tiên #1, xây lại 2026-08-14): đơn đặt trước
    // mà seller CHƯA GIAO (deliveredPayload vẫn null) TUYỆT ĐỐI không được
    // giải ngân — dù escrowReleaseAt đã qua (với đơn đặt trước, escrowReleaseAt
    // = deliveryDeadline, xem POST /api/checkout). Đơn này chỉ có thể kết
    // thúc qua 1 trong 2 đường: seller giao trước hạn (POST /api/seller/orders/
    // [id]/deliver-preorder, nhập xong mới quay lại vòng lặp này bình thường)
    // hoặc auto-hoàn tiền quá hạn (POST /api/admin/preorders/refund-overdue).
    // Dùng isPreOrder SNAPSHOT (không join Product.preOrder — seller có thể
    // tắt cờ đó sau khi bán để né chặn này).
    if (item.isPreOrder && item.deliveredPayload === null) continue;

    // LƯỚI AN TOÀN AUTO-CONFIRM: đơn đã đến hạn giải ngân mà buyer chưa
    // từng bấm lộ hàng (receivedAt null) — tự đánh dấu "đã nhận" để bảo
    // hành bắt đầu tính, tránh treo vô thời hạn nếu buyer không bao giờ bấm.
    // CHỈ áp dụng khi ĐÃ THỰC SỰ có gì đó giao (deliveredPayload khác null)
    // HOẶC là dịch vụ (SERVICE vốn dĩ deliveredPayload luôn null theo thiết
    // kế, không phải dấu hiệu "chưa giao"). CỐ TÌNH KHÔNG áp dụng cho sản
    // phẩm/tool/TUT có deliveredPayload null THẬT (seller chưa từng giao) —
    // đó là lỗ hổng riêng (đặt trước chưa giao hàng vẫn tự giải ngân), giữ
    // nguyên hiện trạng ở đây, không dùng auto-confirm này để che giấu.
    let effectiveItem: typeof item = item;
    if (
      !item.receivedAt &&
      item.warrantyHours !== null &&
      item.warrantyHours > 0 &&
      (item.deliveredPayload !== null || item.product?.productType === "SERVICE")
    ) {
      const receipt = await prisma.$transaction((t) => markReceivedIfNeeded(t, item, now));
      if (receipt) {
        effectiveItem = { ...item, receivedAt: receipt.receivedAt, warrantyExpiresAt: receipt.warrantyExpiresAt };
      }
    }
    if (getEffectiveEscrowReleaseAt(effectiveItem) > now) continue;

    const seller = await prisma.seller.findUnique({ where: { id: item.sellerId } });
    if (!seller) continue;

    // PHÍ SÀN áp cho MỌI đơn — dùng số ĐÃ FREEZE trên OrderItem lúc đặt đơn
    // (không tính lại theo % hiện tại → không hồi tố). Seller nhận (giá trị
    // item − phí sàn). Phần phí giữ lại là doanh thu sàn (nguồn trả hoa hồng
    // nếu đơn có giới thiệu).
    const itemValue = item.price * item.quantity;
    const platformFee = item.platformFeeAmount;
    const sellerCredit = itemValue - platformFee;

    // Gate NGUYÊN TỬ trên từng OrderItem (bug B6): chỉ khi chuyển được
    // ESCROW→RELEASED (count===1) mới cộng ví seller.
    const paid = await prisma.$transaction(async (t) => {
      const gate = await t.orderItem.updateMany({
        where: { id: item.id, status: "ESCROW" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await logOrderStatusChange(t, {
        orderItemId: item.id,
        fromStatus: "ESCROW",
        toStatus: "RELEASED",
        actor,
        note: "Giải ngân ký quỹ đến hạn",
      });
      await purgeServiceIntakeSecrets(t, item.id);
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
          // AUDIT LỖ HỔNG 1 — khoá ngoại thật, theo ĐÚNG dòng hàng được giải ngân.
          orderId: item.orderId,
          orderItemId: item.id,
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

  return { released };
}
