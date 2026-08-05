import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Trả lịch sử đổi trạng thái (OrderStatusHistory) của 1 OrderItem — dùng
// chung cho cả 3 vai trò: buyer (chủ đơn), seller (chủ gian hàng của dòng
// hàng này), admin (không giới hạn). KHÔNG phải nội dung nhạy cảm (chỉ
// trạng thái/thời gian/vai trò actor, KHÔNG có tên/email cụ thể) nên không
// cần ghi audit log khi xem, khác GET reveal-delivered/reveal-credentials.
// AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 3.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: { id: true, sellerId: true, order: { select: { buyerId: true } } },
  });
  if (!item) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isBuyer = item.order.buyerId === session.user.id;
  let isSeller = false;
  if (!isAdmin && !isBuyer) {
    const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
    isSeller = Boolean(seller && item.sellerId === seller.id);
  }
  if (!isAdmin && !isBuyer && !isSeller) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }

  const history = await prisma.orderStatusHistory.findMany({
    where: { orderItemId },
    orderBy: { createdAt: "asc" },
    select: { fromStatus: true, toStatus: true, actorType: true, note: true, createdAt: true },
  });

  return NextResponse.json({ history });
}
