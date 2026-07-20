import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { resolveAuctionSlot } from "@/lib/auction";

export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const expiredSlots = await prisma.auctionSlot.findMany({
    where: { status: "OPEN", endAt: { lte: new Date() } },
    include: { bids: { orderBy: { amount: "desc" } } },
  });

  let resolved = 0;
  let winners = 0;

  for (const slot of expiredSlots) {
    const { won } = await resolveAuctionSlot(slot);
    if (won) winners++;
    resolved++;
  }

  if (resolved > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Giải quyết phiên đấu giá",
      targetType: "AuctionSlot",
      detail: `Đã xử lý ${resolved} vị trí, ${winners} vị trí có người thắng`,
    });
  }

  return NextResponse.json({ resolved, winners });
}
