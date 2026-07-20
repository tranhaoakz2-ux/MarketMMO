import { prisma } from "@/lib/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type SlotWithBids = {
  id: string;
  position: number;
  period: string;
  floorPrice: number;
  bids: { id: string; sellerId: string; productId: string; amount: number }[];
};

// Đóng 1 slot đấu giá (đến hạn HOẶC admin ép đóng sớm) — chọn bid cao nhất
// mà seller đủ tiền làm người thắng, trừ ví, gắn featuredUntil cho sản phẩm
// thắng, đóng slot cũ và mở slot kế tiếp cùng vị trí để hệ thống xoay vòng
// liên tục. Dùng chung cho POST /api/admin/auction/resolve (quét mọi slot
// hết hạn) và POST /api/admin/auction/slots/[id]/close-now (đóng 1 slot cụ
// thể ngay lập tức, bất kể còn hạn hay không).
export async function resolveAuctionSlot(slot: SlotWithBids): Promise<{ won: boolean }> {
  const durationMs = slot.period === "WEEKLY" ? 7 * ONE_DAY_MS : ONE_DAY_MS;
  const now = new Date();

  let winningBid: { bid: SlotWithBids["bids"][number]; userId: string } | null = null;
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
    return { won: true };
  }

  await prisma.auctionSlot.update({ where: { id: slot.id }, data: { status: "CLOSED" } });
  return { won: false };
}
