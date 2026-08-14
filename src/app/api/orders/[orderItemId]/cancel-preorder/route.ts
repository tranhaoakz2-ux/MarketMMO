import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { refundPreOrderItem } from "@/lib/preorder";

// Buyer TỰ HUỶ đơn đặt trước — được huỷ BẤT KỲ LÚC NÀO miễn seller CHƯA giao
// (deliveredPayload vẫn null), hoàn 100% tiền về ví ngay. Sau khi seller đã
// giao thì KHÔNG huỷ được nữa — đi luồng bảo hành/khiếu nại bình thường (nút
// này ẩn khỏi UI lúc đó, nhưng vẫn chặn cứng ở đây phòng gọi thẳng API).
//
// Dùng chung refundPreOrderItem() (src/lib/preorder.ts) với job quét quá hạn
// — gate atomic trong đó tự xử lý race "seller vừa giao đúng lúc buyer bấm
// huỷ": chỉ 1 trong 2 thắng, không bao giờ vừa hoàn tiền buyer vừa cho seller
// giao thành công.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: { id: true, order: { select: { buyerId: true } } },
  });
  // 404 chung cho "không tồn tại" lẫn "không phải đơn của buyer này".
  if (!item || item.order.buyerId !== session!.user.id) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }

  const result = await refundPreOrderItem(
    orderItemId,
    { type: "BUYER", id: session!.user.id },
    "Buyer tự huỷ đặt trước"
  );

  if (!result || !result.done) {
    return NextResponse.json(
      {
        error:
          "Không thể huỷ — đơn đã được người bán giao hoặc đã được xử lý trước đó (vui lòng tải lại trang).",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, amount: result.amount });
}
