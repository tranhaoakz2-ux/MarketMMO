import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { WARRANTY_WINDOW_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// Buyer HOẶC seller của 1 OrderItem đang ESCROW đều có thể mở khiếu nại —
// chuyển status sang "DISPUTED" để loại khỏi vòng giải ngân tự động
// (POST /api/admin/escrow/release chỉ xử lý status "ESCROW"). Chỉ admin mới
// quyết định kết quả cuối (xem POST /api/admin/disputes/[id]).
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const orderItemId = typeof body?.orderItemId === "string" ? body.orderItemId : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

  if (!orderItemId || reason.length < 10) {
    return NextResponse.json(
      { error: "Vui lòng mô tả lý do khiếu nại (tối thiểu 10 ký tự)." },
      { status: 400 }
    );
  }

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, dispute: true },
  });
  if (!orderItem) {
    return NextResponse.json({ error: "Đơn hàng không tồn tại." }, { status: 404 });
  }

  const isBuyer = orderItem.order.buyerId === session!.user.id;
  const seller = await prisma.seller.findUnique({ where: { userId: session!.user.id } });
  const isSeller = Boolean(seller && orderItem.sellerId === seller.id);
  if (!isBuyer && !isSeller) {
    return NextResponse.json(
      { error: "Bạn không có quyền khiếu nại đơn hàng này." },
      { status: 403 }
    );
  }
  if (orderItem.status !== "ESCROW") {
    return NextResponse.json(
      { error: "Chỉ có thể khiếu nại đơn hàng đang trong thời gian ký quỹ." },
      { status: 400 }
    );
  }
  if (orderItem.dispute) {
    return NextResponse.json({ error: "Đơn hàng này đã có khiếu nại." }, { status: 400 });
  }

  // Phần B (SECURITY_AUDIT #8): buyer mở → phải qua BẢO HÀNH với seller trước
  // (phase SELLER_WARRANTY, admin chưa thấy, seller có WARRANTY_WINDOW_HOURS để
  // tự xử). Seller tự mở → đi thẳng PLATFORM (không tự bảo hành cho chính mình).
  const isSellerOpener = isSeller && !isBuyer;
  const phase = isSellerOpener ? "PLATFORM" : "SELLER_WARRANTY";
  const warrantyDeadline = isSellerOpener
    ? null
    : new Date(Date.now() + WARRANTY_WINDOW_HOURS * 3600_000);

  await prisma.$transaction([
    prisma.orderItem.update({ where: { id: orderItemId }, data: { status: "DISPUTED" } }),
    prisma.dispute.create({
      data: { orderItemId, openedById: session!.user.id, reason, phase, warrantyDeadline },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
