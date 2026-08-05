import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Trả nội dung giao hàng thật (OrderItem.deliveredPayload — tài khoản/mật
// khẩu/mã kích hoạt) cho ĐÚNG buyer đã mua dòng hàng này — TÁCH RIÊNG khỏi
// việc render trang /don-hang (trang đó giờ CHỈ gửi `hasDeliveredPayload`
// boolean, KHÔNG còn nhúng thẳng nội dung vào SSR như trước) để có 1 điểm
// server thật sự ghi lại "buyer đã xem lúc nào" — AUDIT LỊCH SỬ ĐƠN HÀNG,
// LỖ HỔNG 2 (mirror GET /api/admin/disputes/[id]/delivered +
// POST /api/seller/orders/[id]/reveal-credentials).
//
// Ghi DeliveredPayloadAccessLog TRƯỚC khi trả nội dung, KHÔNG try/catch —
// ghi vết thất bại thì trả 500, không lộ nội dung (fail-closed, cùng
// nguyên tắc "chính cái vết mới là biện pháp kiểm soát" đã áp dụng cho
// route admin xem nội dung đã giao). Mỗi lần xem (kể cả xem lại) đều ghi
// thêm 1 dòng, không dedupe.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      status: true,
      deliveredPayload: true,
      deliveredExpiresAt: true,
      order: { select: { buyerId: true } },
    },
  });

  // 404 chung cho cả "không tồn tại" lẫn "không phải đơn của buyer này" —
  // tránh lộ thông tin đơn hàng người khác qua sự khác biệt lỗi.
  if (!item || item.order.buyerId !== session!.user.id) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }
  if (!item.deliveredPayload) {
    return NextResponse.json({ error: "Đơn hàng này chưa có nội dung giao hàng." }, { status: 400 });
  }
  // Đơn đã hoàn 100% tiền (CANCELLED — nguồn duy nhất là hoàn tiền toàn bộ
  // khiếu nại) thì buyer mất quyền xem/copy tiếp — giữ đúng luật hiện có ở
  // /don-hang (trước đây chỉ ẩn phía UI, giờ enforce luôn ở server vì nội
  // dung không còn nhúng sẵn trong HTML nữa).
  if (item.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Đơn hàng đã được hoàn tiền toàn bộ, không thể xem lại nội dung đã giao." },
      { status: 400 }
    );
  }

  await prisma.deliveredPayloadAccessLog.create({
    data: {
      orderItemId: item.id,
      buyerId: session!.user.id,
      ipAddress: clientIp(req),
    },
  });

  return NextResponse.json({
    deliveredPayload: item.deliveredPayload,
    deliveredExpiresAt: item.deliveredExpiresAt,
  });
}
