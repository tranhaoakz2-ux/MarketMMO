import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { refundOverdueManualProvisionItems } from "@/lib/manual-provision";

// Nút admin bấm tay — dùng khi cron chưa kịp chạy hoặc cần test. Gọi CHUNG
// hàm với cron (GET /api/cron/daily) — idempotent, bấm nhiều lần không hoàn
// 2 lần (xem gate nguyên tử trong refundOverdueManualProvisionItem(),
// src/lib/manual-provision.ts).
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { refunded, totalAmount } = await refundOverdueManualProvisionItems({ type: "ADMIN", id: session!.user!.id });

  if (refunded > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Quét hoàn tiền giao thủ công (VPS) quá hạn",
      targetType: "OrderItem",
      detail: `Đã hoàn ${refunded} đơn, tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
    });
  }

  return NextResponse.json({ refunded, totalAmount });
}
