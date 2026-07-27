import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { SERVICE_CREDENTIAL_DEFAULT_WINDOW_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// Seller "Nhận đơn dịch vụ" — điều kiện BẮT BUỘC để sau đó xem được field
// nhạy cảm (mật khẩu/OTP) buyer đã cung cấp, xem model ServiceIntake. Đóng
// băng `sensitiveRevealDeadline` NGAY tại thời điểm này (không tính lại nếu
// seller đổi Product.credentialViewWindowHours sau) — công bằng cho buyer:
// seller không thể "kéo dài" cửa sổ xem bằng cách đổi cấu hình sau khi đã
// nhận đơn.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { product: { select: { credentialViewWindowHours: true } }, serviceIntake: true },
  });
  if (!item || !item.serviceIntake) {
    return NextResponse.json({ error: "Không tìm thấy đơn dịch vụ." }, { status: 404 });
  }
  if (item.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Đơn hàng này không thuộc gian hàng của bạn." }, { status: 403 });
  }
  if (item.status !== "ESCROW") {
    return NextResponse.json(
      { error: "Chỉ có thể nhận đơn đang trong trạng thái ký quỹ." },
      { status: 400 }
    );
  }

  const windowHours =
    item.product.credentialViewWindowHours ?? SERVICE_CREDENTIAL_DEFAULT_WINDOW_HOURS;
  const now = new Date();
  const deadline = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  // Atomic — chỉ set khi CHƯA nhận trước đó, chặn nhận 2 lần dời hạn xem.
  const gate = await prisma.serviceIntake.updateMany({
    where: { orderItemId, sellerAcceptedAt: null },
    data: { sellerAcceptedAt: now, sensitiveRevealDeadline: deadline },
  });
  if (gate.count === 0) {
    return NextResponse.json({ error: "Đơn này đã được nhận trước đó." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sensitiveRevealDeadline: deadline.toISOString() });
}
