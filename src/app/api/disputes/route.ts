import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { POST_RELEASE_WARRANTY_DAYS, WARRANTY_WINDOW_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// Buyer HOẶC seller của 1 OrderItem đang ESCROW đều có thể mở khiếu nại —
// chuyển status sang "DISPUTED" để loại khỏi vòng giải ngân tự động
// (POST /api/admin/escrow/release chỉ xử lý status "ESCROW"). Chỉ admin mới
// quyết định kết quả cuối (xem POST /api/admin/disputes/[id]).
//
// RIÊNG buyer còn mở được 1 loại khiếu nại thứ 2 — "bảo hành sau giải ngân"
// (POST_RELEASE_WARRANTY) — khi đơn ĐÃ RELEASED (tiền đã vào ví seller),
// trong vòng POST_RELEASE_WARRANTY_DAYS kể từ OrderItem.releasedAt. Khác
// luồng ESCROW: đi thẳng admin (seller đã có tiền, không tự bảo hành),
// KHÔNG đổi OrderItem.status (đơn hàng/doanh thu đã chốt thật, không "lùi"
// lại), và khi admin duyệt sẽ đền bù từ QUỸ BẢO HIỂM của seller thay vì
// escrow (đã không còn) — xem POST /api/admin/disputes/[id].
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
  if (orderItem.dispute) {
    return NextResponse.json({ error: "Đơn hàng này đã có khiếu nại." }, { status: 400 });
  }

  // ── Luồng 1: đơn còn ký quỹ (ESCROW) — y hệt trước đây ──
  if (orderItem.status === "ESCROW") {
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

  // ── Luồng 2: đơn đã giải ngân (RELEASED) — bảo hành sau giải ngân ──
  if (orderItem.status === "RELEASED") {
    if (!isBuyer) {
      return NextResponse.json(
        { error: "Chỉ người mua mới được mở khiếu nại bảo hành sau giải ngân." },
        { status: 403 }
      );
    }
    if (!orderItem.releasedAt) {
      return NextResponse.json(
        {
          error:
            "Đơn hàng này chưa có mốc thời gian giải ngân, không thể mở khiếu nại bảo hành sau giải ngân.",
        },
        { status: 400 }
      );
    }
    const deadline = new Date(
      orderItem.releasedAt.getTime() + POST_RELEASE_WARRANTY_DAYS * 24 * 3600_000
    );
    if (new Date() > deadline) {
      return NextResponse.json(
        {
          error: `Đã quá ${POST_RELEASE_WARRANTY_DAYS} ngày kể từ khi giải ngân, không thể khiếu nại bảo hành nữa.`,
        },
        { status: 400 }
      );
    }

    // KHÔNG đổi OrderItem.status — đơn hàng/doanh thu đã chốt thật, giữ nguyên RELEASED.
    await prisma.dispute.create({
      data: {
        orderItemId,
        openedById: session!.user.id,
        reason,
        phase: "POST_RELEASE_WARRANTY",
        warrantyDeadline: null,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    {
      error:
        "Chỉ có thể khiếu nại đơn hàng đang trong thời gian ký quỹ hoặc còn trong hạn bảo hành sau giải ngân.",
    },
    { status: 400 }
  );
}
