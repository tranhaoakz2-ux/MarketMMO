import type { Prisma } from "@prisma/client";

export type OrderStatusActor =
  | { type: "BUYER" | "SELLER" | "ADMIN"; id: string }
  | { type: "SYSTEM"; id?: null };

// Ghi 1 dòng lịch sử đổi trạng thái đơn — PHẢI gọi TRONG CÙNG transaction với
// thao tác đổi OrderItem.status (không phải fail-closed như
// DeliveredPayloadAccessLog — ở đây log và đổi trạng thái là 1 sự kiện duy
// nhất, transaction rollback thì cả hai cùng mất). AUDIT LỊCH SỬ ĐƠN HÀNG —
// LỖ HỔNG 3. Xem 6 điểm gọi: checkout, escrow release, mở khiếu nại,
// fullRefundDispute(), admin partial_refund, admin release_seller.
export async function logOrderStatusChange(
  tx: Prisma.TransactionClient,
  params: {
    orderItemId: string;
    fromStatus: string | null;
    toStatus: string;
    actor: OrderStatusActor;
    note?: string | null;
  }
) {
  await tx.orderStatusHistory.create({
    data: {
      orderItemId: params.orderItemId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actorType: params.actor.type,
      actorId: params.actor.id ?? null,
      note: params.note ?? null,
    },
  });
}
