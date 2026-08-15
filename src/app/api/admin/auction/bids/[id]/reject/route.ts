import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { rejectAuctionBid } from "@/lib/auction";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim().slice(0, 500) : null;

  try {
    await rejectAuctionBid(id, session!.user!.id, adminNote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Từ chối thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Từ chối thắng đấu giá vị trí vàng",
    targetType: "AuctionBid",
    targetId: id,
    detail: adminNote ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
