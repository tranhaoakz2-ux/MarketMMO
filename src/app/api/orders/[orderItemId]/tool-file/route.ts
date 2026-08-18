import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { readUploadedFile } from "@/lib/uploads";

// Tải file tool (.zip) đã upload cho sản phẩm loại TOOL/AI Agent — NỘI DUNG
// GIAO nhạy cảm, mirror đúng GET /api/messages/attachments/[messageId] (xác
// thực quyền trước khi đọc file, KHÔNG có URL public nào cho file này).
//
// Khác 1 điểm: bắt buộc `receivedAt` đã được set (tức buyer đã bấm "Xem" ít
// nhất 1 lần qua POST /api/orders/[id]/reveal-delivered) — chặn trường hợp
// đoán/dựng thẳng URL này mà chưa qua bước lộ hàng (bỏ qua audit log +
// chưa bắt đầu tính bảo hành). File tool là tài nguyên DÙNG CHUNG (đọc live
// từ Product.toolFileUrl, không snapshot vào OrderItem — xem
// Product.toolFileUrl trong schema.prisma) nên không cần thêm dòng log
// riêng ở đây, 1 lượt bấm "Xem" đã được ghi nhận đủ.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      status: true,
      receivedAt: true,
      order: { select: { buyerId: true } },
      product: { select: { productType: true, toolFileUrl: true, toolFileName: true } },
    },
  });

  // 404 chung cho mọi lý do không hợp lệ (không tồn tại, không phải đơn của
  // buyer này, không phải TOOL, chưa có file) — tránh lộ thông tin qua sự
  // khác biệt lỗi, cùng quy ước reveal-delivered đang dùng.
  if (
    !item ||
    item.order.buyerId !== session!.user.id ||
    item.product?.productType !== "TOOL" ||
    !item.product.toolFileUrl
  ) {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
  if (item.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Đơn hàng đã được hoàn tiền toàn bộ, không thể tải file." },
      { status: 400 }
    );
  }
  if (!item.receivedAt) {
    return NextResponse.json(
      { error: "Vui lòng bấm \"Xem\" để nhận hàng trước khi tải file." },
      { status: 403 }
    );
  }

  try {
    const buffer = await readUploadedFile(item.product.toolFileUrl);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(item.product.toolFileName ?? "tool.zip")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
}
