import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getOrCreateConversation } from "@/lib/system-bot";

// Lấy (get-or-create) hội thoại buyer↔seller của 1 khiếu nại — dùng chung cho
// CẢ hai phía (buyer ở /don-hang, seller ở /trang-ban-hang/khieu-nai). Chỉ đúng
// buyer HOẶC seller của đơn bị khiếu nại đó mới truy cập được (người thứ ba →
// 403). Tin nhắn của luồng này gắn disputeId nên KHÔNG lẫn chat chung (Cách B).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    select: {
      orderItem: { select: { sellerId: true, order: { select: { buyerId: true } } } },
    },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }

  const seller = await prisma.seller.findUnique({
    where: { id: dispute.orderItem.sellerId },
    select: { userId: true },
  });
  if (!seller) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }

  const buyerId = dispute.orderItem.order.buyerId;
  const sellerUserId = seller.userId;

  // Chốt quyền: chỉ 2 bên của đơn. Seller A không phải seller của đơn -> 403,
  // không lộ hội thoại của người khác.
  if (userId !== buyerId && userId !== sellerUserId) {
    return NextResponse.json({ error: "Bạn không có quyền với khiếu nại này." }, { status: 403 });
  }

  const conversation = await getOrCreateConversation(buyerId, sellerUserId);
  const otherUserId = userId === buyerId ? sellerUserId : buyerId;
  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { name: true, username: true },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    otherName: other?.name ?? other?.username ?? "Người dùng",
    role: userId === buyerId ? "buyer" : "seller",
  });
}
