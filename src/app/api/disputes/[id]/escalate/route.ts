import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Buyer ĐƯA KHIẾU NẠI LÊN SÀN (escalate) sau khi qua bước bảo hành với seller —
// SECURITY_AUDIT #8 Phần B. Chỉ được escalate khi: đúng buyer của đơn, dispute
// còn OPEN + đang ở pha SELLER_WARRANTY, VÀ (seller đã từ chối HOẶC đã quá hạn
// bảo hành). Chuyển phase → PLATFORM (atomic) để admin bắt đầu thấy + xử.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { orderItem: { include: { order: true } } },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }
  if (dispute.orderItem.order.buyerId !== session!.user.id) {
    return NextResponse.json({ error: "Bạn không có quyền với khiếu nại này." }, { status: 403 });
  }
  if (dispute.status !== "OPEN" || dispute.phase !== "SELLER_WARRANTY") {
    return NextResponse.json(
      { error: "Khiếu nại không ở trạng thái có thể đưa lên sàn." },
      { status: 400 }
    );
  }
  const canEscalate =
    dispute.warrantyRejectedAt !== null ||
    (dispute.warrantyDeadline !== null && dispute.warrantyDeadline <= new Date());
  if (!canEscalate) {
    return NextResponse.json(
      { error: "Vui lòng chờ người bán bảo hành đến hết hạn trước khi đưa lên sàn." },
      { status: 400 }
    );
  }

  // Atomic: chỉ chuyển được khi vẫn đúng OPEN + SELLER_WARRANTY (chặn đua với
  // seller vừa hoàn tiền/từ chối cùng lúc).
  const moved = await prisma.dispute.updateMany({
    where: { id, status: "OPEN", phase: "SELLER_WARRANTY" },
    data: { phase: "PLATFORM" },
  });
  if (moved.count === 0) {
    return NextResponse.json({ error: "Khiếu nại vừa được cập nhật, vui lòng tải lại." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
