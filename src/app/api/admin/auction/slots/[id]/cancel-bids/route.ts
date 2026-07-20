import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Huỷ toàn bộ lượt đặt giá của 1 slot đang OPEN — dùng khi phát hiện đặt giá
// bất thường/spam, KHÔNG đụng tới ví ai (chưa ai bị trừ tiền lúc đặt giá,
// tiền chỉ trừ khi thắng — xem POST /api/admin/auction/resolve).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const slot = await prisma.auctionSlot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Không tìm thấy vị trí đấu giá." }, { status: 404 });
  if (slot.status !== "OPEN") {
    return NextResponse.json({ error: "Chỉ huỷ được lượt đặt giá của slot đang mở." }, { status: 400 });
  }

  const { count } = await prisma.auctionBid.deleteMany({ where: { slotId: id } });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Huỷ toàn bộ lượt đặt giá",
    targetType: "AuctionSlot",
    targetId: id,
    detail: `Vị trí #${slot.position} — đã xoá ${count} lượt`,
  });

  return NextResponse.json({ ok: true, cancelled: count });
}
