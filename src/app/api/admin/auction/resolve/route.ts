import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const expiredSlots = await prisma.auctionSlot.findMany({
    where: { status: "OPEN", endAt: { lte: new Date() } },
    include: { bids: { orderBy: { amount: "desc" } } },
  });

  let resolved = 0;
  let winners = 0;

  for (const slot of expiredSlots) {
    const durationMs = slot.period === "WEEKLY" ? 7 * ONE_DAY_MS : ONE_DAY_MS;
    const now = new Date();

    let winningBid = null;
    for (const bid of slot.bids) {
      const seller = await prisma.seller.findUnique({ where: { id: bid.sellerId } });
      if (!seller) continue;
      const user = await prisma.user.findUnique({ where: { id: seller.userId } });
      if (user && user.walletBalance >= bid.amount) {
        winningBid = { bid, userId: user.id };
        break;
      }
    }

    const newSlot = await prisma.auctionSlot.create({
      data: {
        position: slot.position,
        period: slot.period,
        floorPrice: slot.floorPrice,
        startAt: now,
        endAt: new Date(now.getTime() + durationMs),
        status: "OPEN",
      },
    });

    if (winningBid) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: winningBid.userId },
          data: { walletBalance: { decrement: winningBid.bid.amount } },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: winningBid.userId,
            type: "PURCHASE",
            amount: -winningBid.bid.amount,
            status: "CONFIRMED",
            note: `Thắng đấu giá vị trí vàng #${slot.position} (${slot.period === "WEEKLY" ? "tuần" : "ngày"})`,
            confirmedAt: now,
          },
        }),
        prisma.product.update({
          where: { id: winningBid.bid.productId },
          data: { featuredUntil: newSlot.endAt },
        }),
        prisma.auctionSlot.update({
          where: { id: slot.id },
          data: { status: "CLOSED", winningBidId: winningBid.bid.id },
        }),
      ]);
      winners++;
    } else {
      await prisma.auctionSlot.update({
        where: { id: slot.id },
        data: { status: "CLOSED" },
      });
    }
    resolved++;
  }

  return NextResponse.json({ resolved, winners });
}
