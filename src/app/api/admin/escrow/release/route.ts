import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { releaseDueEscrow } from "@/lib/escrow";

// Nút admin "Chạy giải ngân ký quỹ" bấm tay — logic thật đã tách ra
// releaseDueEscrow() (src/lib/escrow.ts) để dùng CHUNG với POST
// /api/cron/daily (chạy tự động mỗi ngày).
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { released } = await releaseDueEscrow({ type: "ADMIN", id: session!.user!.id });

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
