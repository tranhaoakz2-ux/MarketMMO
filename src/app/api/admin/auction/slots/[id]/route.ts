import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Sửa giá sàn (floorPrice) của 1 slot đấu giá — chỉ áp dụng cho slot đang
// OPEN, không ảnh hưởng slot đã đóng (lịch sử).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const floorPrice = Number(body?.floorPrice);
  if (!Number.isFinite(floorPrice) || floorPrice < 0) {
    return NextResponse.json({ error: "Giá sàn không hợp lệ." }, { status: 400 });
  }

  const slot = await prisma.auctionSlot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Không tìm thấy vị trí đấu giá." }, { status: 404 });
  if (slot.status !== "OPEN") {
    return NextResponse.json({ error: "Chỉ sửa được giá sàn của slot đang mở." }, { status: 400 });
  }

  await prisma.auctionSlot.update({ where: { id }, data: { floorPrice } });
  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa giá sàn đấu giá",
    targetType: "AuctionSlot",
    targetId: id,
    detail: `Vị trí #${slot.position} → ${floorPrice}đ`,
  });

  return NextResponse.json({ ok: true });
}
