import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Gán thủ công 1 sản phẩm vào vị trí vàng, BỎ QUA quy trình đấu giá bình
// thường — dùng khi admin muốn ưu đãi/khuyến mãi cho 1 seller cụ thể mà
// không cần chờ họ đặt giá. Đóng slot hiện tại ngay lập tức và mở slot kế
// tiếp cùng vị trí/kỳ hạn, giống hệt cơ chế xoay vòng của
// POST /api/admin/auction/resolve (để hệ thống không "đứng hình" ở vị trí
// vừa gán).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slotId = typeof body?.slotId === "string" ? body.slotId : null;
  const productId = typeof body?.productId === "string" ? body.productId : null;
  const chargeSeller = body?.chargeSeller === true;
  const amount = Number(body?.amount);

  if (!slotId || !productId) {
    return NextResponse.json({ error: "Thiếu vị trí hoặc sản phẩm." }, { status: 400 });
  }
  if (chargeSeller && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "Số tiền thu không hợp lệ." }, { status: 400 });
  }

  const slot = await prisma.auctionSlot.findUnique({ where: { id: slotId } });
  if (!slot) return NextResponse.json({ error: "Không tìm thấy vị trí đấu giá." }, { status: 404 });
  if (slot.status !== "OPEN") {
    return NextResponse.json({ error: "Vị trí này đã đóng." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true },
  });
  if (!product || product.status !== "APPROVED") {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm đã duyệt." }, { status: 404 });
  }

  const durationMs = slot.period === "WEEKLY" ? 7 * ONE_DAY_MS : ONE_DAY_MS;
  const now = new Date();
  const endAt = new Date(now.getTime() + durationMs);

  if (chargeSeller) {
    const user = await prisma.user.findUnique({ where: { id: product.seller.userId } });
    if (!user || user.walletBalance < amount) {
      return NextResponse.json({ error: "Số dư ví của seller không đủ." }, { status: 400 });
    }
  }

  const newSlot = await prisma.auctionSlot.create({
    data: {
      position: slot.position,
      period: slot.period,
      floorPrice: slot.floorPrice,
      startAt: now,
      endAt,
      status: "OPEN",
    },
  });

  await prisma.$transaction([
    ...(chargeSeller
      ? [
          prisma.user.update({
            where: { id: product.seller.userId },
            data: { walletBalance: { decrement: amount } },
          }),
          prisma.walletTransaction.create({
            data: {
              userId: product.seller.userId,
              type: "PURCHASE",
              amount: -amount,
              status: "CONFIRMED",
              note: `Admin gán thủ công vị trí vàng #${slot.position} (${slot.period === "WEEKLY" ? "tuần" : "ngày"})`,
              confirmedAt: now,
            },
          }),
        ]
      : []),
    prisma.product.update({ where: { id: productId }, data: { featuredUntil: endAt } }),
    prisma.auctionSlot.update({ where: { id: slotId }, data: { status: "CLOSED" } }),
  ]);

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Gán thủ công vị trí vàng",
    targetType: "AuctionSlot",
    targetId: slotId,
    detail: `Vị trí #${slot.position} → ${product.name} (${product.seller.shopName})${chargeSeller ? ` — thu ${amount}đ` : " — miễn phí"}`,
  });

  return NextResponse.json({ ok: true, newSlotId: newSlot.id });
}
