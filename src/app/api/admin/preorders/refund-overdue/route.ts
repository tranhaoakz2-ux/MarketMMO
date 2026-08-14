import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { refundPreOrderItem } from "@/lib/preorder";

// Quét + AUTO-HOÀN TIỀN toàn bộ đơn đặt trước seller KHÔNG giao đúng hạn —
// isPreOrder=true, deliveredPayload vẫn NULL (chưa giao), deliveryDeadline đã
// qua, status vẫn ESCROW. Dùng chung refundPreOrderItem() (src/lib/preorder.ts)
// với route buyer tự huỷ — gate atomic trong đó tự đảm bảo IDEMPOTENT (chạy
// route này 2 lần không hoàn 2 lần: lần 2 status đã CANCELLED, WHERE không
// khớp) và tự chặn race với seller vừa giao đúng lúc job này chạy.
//
// Sàn CHƯA có cron tự động — cần gọi endpoint này định kỳ (Vercel Cron/
// Windows Task Scheduler/cron VPS khi triển khai thật), cùng quy ước với
// POST /api/admin/escrow/release và POST /api/admin/auction/resolve. Admin
// cũng có thể bấm tay tại Admin > Đơn hàng & Ký quỹ (AdminPreOrderRefundButton).
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const now = new Date();
  const overdueItems = await prisma.orderItem.findMany({
    where: {
      status: "ESCROW",
      isPreOrder: true,
      deliveredPayload: null,
      deliveryDeadline: { lte: now },
    },
    select: { id: true },
  });

  let refunded = 0;
  let totalAmount = 0;
  for (const item of overdueItems) {
    const result = await refundPreOrderItem(
      item.id,
      { type: "SYSTEM" },
      "Quá hạn giao hàng cam kết — tự động hoàn tiền"
    );
    if (result?.done) {
      refunded++;
      totalAmount += result.amount;
    }
  }

  if (refunded > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Quét hoàn tiền đặt trước quá hạn",
      targetType: "OrderItem",
      detail: `Đã hoàn ${refunded} đơn, tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
    });
  }

  return NextResponse.json({ refunded, totalAmount });
}
