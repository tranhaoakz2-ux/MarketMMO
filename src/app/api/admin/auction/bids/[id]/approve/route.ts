import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { approveAuctionBid } from "@/lib/auction";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    await approveAuctionBid(id, session!.user!.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Duyệt thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Duyệt thắng đấu giá vị trí vàng",
    targetType: "AuctionBid",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
