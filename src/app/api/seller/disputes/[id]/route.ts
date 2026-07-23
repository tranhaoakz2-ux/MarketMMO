import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fullRefundDispute } from "@/lib/disputes";

// Seller TỰ XỬ bảo hành 1 khiếu nại đang ở pha SELLER_WARRANTY của ĐƠN CỦA MÌNH
// (SECURITY_AUDIT #8 Phần B) — TRƯỚC khi buyer escalate lên sàn:
//   - action "refund": tự nguyện hoàn TOÀN BỘ cho buyer (dùng chung logic full
//     refund với admin — đốt kho + ẩn content, xem src/lib/disputes.ts).
//   - action "reject": từ chối bảo hành → set warrantyRejectedAt, buyer được
//     escalate ngay. Dispute vẫn OPEN + SELLER_WARRANTY (seller vẫn có thể đổi ý
//     hoàn tiền cho tới khi buyer escalate).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { orderItem: { select: { sellerId: true } } },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }
  if (dispute.orderItem.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Khiếu nại này không thuộc gian hàng của bạn." }, { status: 403 });
  }
  if (dispute.status !== "OPEN" || dispute.phase !== "SELLER_WARRANTY") {
    return NextResponse.json(
      { error: "Khiếu nại này không còn ở giai đoạn bảo hành." },
      { status: 400 }
    );
  }

  if (action === "refund") {
    const result = await fullRefundDispute(id);
    if (!result || !result.done) {
      return NextResponse.json({ error: "Khiếu nại vừa được cập nhật, vui lòng tải lại." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    // Atomic: chỉ set khi vẫn OPEN + SELLER_WARRANTY + chưa từ chối trước đó.
    const done = await prisma.dispute.updateMany({
      where: { id, status: "OPEN", phase: "SELLER_WARRANTY", warrantyRejectedAt: null },
      data: { warrantyRejectedAt: new Date() },
    });
    if (done.count === 0) {
      return NextResponse.json({ error: "Khiếu nại vừa được cập nhật, vui lòng tải lại." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
