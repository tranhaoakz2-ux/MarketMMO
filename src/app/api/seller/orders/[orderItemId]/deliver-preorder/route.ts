import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logOrderStatusChange } from "@/lib/order-status-history";

const MAX_LINE_LENGTH = 2000;

// Seller GIAO HÀNG cho 1 đơn đặt trước — set OrderItem.deliveredPayload thủ
// công (khác kho thật ProductStockItem: đây là nội dung dành RIÊNG cho ĐÚNG
// đơn này, không claim từ pool chung). Sau khi giao, đơn nhập lại ĐÚNG luồng
// thường: buyer bấm lộ hàng (POST /api/orders/[id]/reveal-delivered, KHÔNG
// đổi gì ở route đó ngoài 1 guard preorder-chưa-giao) → set receivedAt → bảo
// hành bắt đầu → giữ ký quỹ đến hết bảo hành mới giải ngân (nguyên cơ chế đã
// có, xem src/lib/warranty.ts).
//
// Gate NGUYÊN TỬ trên chính lệnh UPDATE — bắt buộc CÒN TRONG HẠN
// (deliveryDeadline > now) — chặn seller "giao trễ" đúng lúc job quét quá hạn
// (POST /api/admin/preorders/refund-overdue) đang/sắp chạy: nếu deadline đã
// qua, WHERE không khớp, seller nhận lỗi rõ ràng thay vì âm thầm giao vào 1
// đơn sắp bị hoàn tiền — chỉ 1 trong 2 bên (seller giao / job hoàn tiền)
// thắng, không bao giờ cả hai cùng thành công.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item || item.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }
  if (!item.isPreOrder) {
    return NextResponse.json({ error: "Đơn hàng này không phải đơn đặt trước." }, { status: 400 });
  }
  if (item.status !== "ESCROW") {
    return NextResponse.json(
      { error: "Đơn hàng này không còn ở trạng thái có thể giao (đã huỷ/tranh chấp/hoàn tất)." },
      { status: 400 }
    );
  }
  if (item.deliveredPayload !== null) {
    return NextResponse.json({ error: "Đơn hàng này đã được giao trước đó." }, { status: 400 });
  }
  if (item.deliveryDeadline && item.deliveryDeadline <= new Date()) {
    return NextResponse.json(
      {
        error:
          "Đã quá hạn giao hàng cam kết — đơn này sẽ được hệ thống tự động hoàn tiền cho người mua, không thể giao nữa.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawContent: string = typeof body?.content === "string" ? body.content : "";
  const lines = rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length !== item.quantity) {
    return NextResponse.json(
      {
        error: `Vui lòng nhập đúng ${item.quantity} dòng nội dung (mỗi dòng ứng với 1 đơn vị đã mua, hiện có ${lines.length} dòng).`,
      },
      { status: 400 }
    );
  }
  const tooLong = lines.find((l) => l.length > MAX_LINE_LENGTH);
  if (tooLong) {
    return NextResponse.json({ error: `Mỗi dòng tối đa ${MAX_LINE_LENGTH} ký tự.` }, { status: 400 });
  }

  const deliveredPayload = JSON.stringify(lines);

  const done = await prisma.$transaction(async (tx) => {
    const gate = await tx.orderItem.updateMany({
      where: {
        id: orderItemId,
        status: "ESCROW",
        isPreOrder: true,
        deliveredPayload: null,
        deliveryDeadline: { gt: new Date() },
      },
      data: { deliveredPayload },
    });
    if (gate.count === 0) return false;

    await logOrderStatusChange(tx, {
      orderItemId,
      fromStatus: "ESCROW",
      toStatus: "ESCROW",
      actor: { type: "SELLER", id: seller!.userId },
      note: "Seller giao hàng đặt trước",
    });
    return true;
  });

  if (!done) {
    return NextResponse.json(
      { error: "Không thể giao — đơn đã bị huỷ/hoàn tiền hoặc đã được giao trước đó (vui lòng tải lại trang)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
