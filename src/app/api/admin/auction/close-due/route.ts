import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { closeDueAuctionSessions } from "@/lib/auction";

// Nút admin "Chốt phiên" bấm tay — dùng khi cron chưa kịp chạy hoặc cần test.
// Gọi CHUNG hàm với cron (POST /api/cron/daily) — idempotent, bấm nhiều lần
// không chốt trùng (xem closeAuctionSession() trong src/lib/auction.ts).
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { sessionsClosed } = await closeDueAuctionSessions();

  if (sessionsClosed > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Chốt phiên đấu giá vị trí vàng (bấm tay)",
      targetType: "AuctionSession",
      detail: `Đã chốt ${sessionsClosed} phiên`,
    });
  }

  return NextResponse.json({ sessionsClosed });
}
