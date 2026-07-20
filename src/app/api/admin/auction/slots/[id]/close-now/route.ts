import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { resolveAuctionSlot } from "@/lib/auction";

// "Đóng phiên ngay" — ép 1 slot đang OPEN đóng NGAY LẬP TỨC bất kể còn hạn
// hay không, dùng cùng logic chọn người thắng với giải quyết hàng loạt
// (POST /api/admin/auction/resolve), chỉ khác ở chỗ không cần đợi endAt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const slot = await prisma.auctionSlot.findUnique({
    where: { id },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
  if (!slot) return NextResponse.json({ error: "Không tìm thấy vị trí đấu giá." }, { status: 404 });
  if (slot.status !== "OPEN") {
    return NextResponse.json({ error: "Vị trí này đã đóng." }, { status: 400 });
  }

  const { won } = await resolveAuctionSlot(slot);

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đóng phiên đấu giá thủ công",
    targetType: "AuctionSlot",
    targetId: id,
    detail: `Vị trí #${slot.position}${won ? " — có người thắng" : " — không có người thắng đủ điều kiện"}`,
  });

  return NextResponse.json({ ok: true, won });
}
