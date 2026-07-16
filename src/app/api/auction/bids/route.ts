import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slotId = typeof body?.slotId === "string" ? body.slotId : "";
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const amount = Number(body?.amount);

  if (!slotId || !productId) {
    return NextResponse.json({ error: "Thiếu thông tin đấu giá." }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return NextResponse.json({ error: "Giá đấu không hợp lệ." }, { status: 400 });
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: session!.user.id },
  });
  if (!seller) {
    return NextResponse.json(
      { error: "Bạn cần có gian hàng để tham gia đấu giá. Hãy đăng ký bán hàng trước." },
      { status: 403 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller.id) {
    return NextResponse.json(
      { error: "Sản phẩm không hợp lệ hoặc không thuộc gian hàng của bạn." },
      { status: 403 }
    );
  }

  const slot = await prisma.auctionSlot.findUnique({
    where: { id: slotId },
    include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
  });
  if (!slot || slot.status !== "OPEN" || slot.endAt <= new Date()) {
    return NextResponse.json(
      { error: "Phiên đấu giá này đã kết thúc hoặc không tồn tại." },
      { status: 400 }
    );
  }

  const currentHighest = slot.bids[0]?.amount ?? slot.floorPrice - 1;
  if (amount < slot.floorPrice) {
    return NextResponse.json(
      { error: `Giá đấu phải từ ${slot.floorPrice.toLocaleString("vi-VN")}đ trở lên.` },
      { status: 400 }
    );
  }
  if (amount <= currentHighest) {
    return NextResponse.json(
      { error: `Giá đấu phải cao hơn giá cao nhất hiện tại (${currentHighest.toLocaleString("vi-VN")}đ).` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
  if (user.walletBalance < amount) {
    return NextResponse.json(
      { error: "Số dư ví không đủ để đặt giá đấu này. Vui lòng nạp thêm tiền." },
      { status: 400 }
    );
  }

  const bid = await prisma.auctionBid.create({
    data: { slotId, sellerId: seller.id, productId, amount },
  });

  return NextResponse.json({ id: bid.id });
}
