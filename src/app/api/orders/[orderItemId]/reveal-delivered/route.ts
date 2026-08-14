import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveFields } from "@/lib/service-crypto";
import { markReceivedIfNeeded } from "@/lib/warranty";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Trả nội dung giao hàng thật (OrderItem.deliveredPayload — tài khoản/mật
// khẩu/mã kích hoạt) cho ĐÚNG buyer đã mua dòng hàng này — TÁCH RIÊNG khỏi
// việc render trang /don-hang (trang đó CHỈ gửi `hasDeliveredPayload`
// boolean, KHÔNG bao giờ gửi nội dung thật) để có 1 điểm server thật sự ghi
// lại "buyer đã xem lúc nào" — AUDIT LỊCH SỬ ĐƠN HÀNG, LỖ HỔNG 2 (mirror
// GET /api/admin/disputes/[id]/delivered + POST /api/seller/orders/[id]/reveal-credentials).
//
// ĐỒNG THỜI cũng là mốc NEO "đã nhận hàng" toàn sàn — bấm lộ hàng LẦN ĐẦU
// (bất kể sản phẩm/dịch vụ/tool/TUT, kể cả dịch vụ không có nội dung gì để
// xem) tự động set OrderItem.receivedAt + bắt đầu tính bảo hành, thay hẳn
// nút "Xác nhận đã nhận hàng" cũ đã bỏ (xem markReceivedIfNeeded(),
// src/lib/warranty.ts). Đọc + ghi nhận trong CÙNG 1 transaction — nội dung
// chỉ rời server trong đúng lượt gọi này, không có API/query nào khác trả
// deliveredPayload cho buyer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { orderItemId } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        status: true,
        receivedAt: true,
        warrantyHours: true,
        deliveredPayload: true,
        deliveredExpiresAt: true,
        deliveredPayloadEncryption: true,
        order: { select: { buyerId: true } },
        product: { select: { productType: true, toolUsageGuide: true } },
      },
    });

    // 404 chung cho cả "không tồn tại" lẫn "không phải đơn của buyer này" —
    // tránh lộ thông tin đơn hàng người khác qua sự khác biệt lỗi.
    if (!item || item.order.buyerId !== session!.user.id) {
      return { kind: "not_found" as const };
    }
    // Đơn đã hoàn 100% tiền (CANCELLED — nguồn duy nhất là hoàn tiền toàn bộ
    // khiếu nại) thì buyer mất quyền xem/copy tiếp — giữ đúng luật hiện có.
    if (item.status === "CANCELLED") {
      return { kind: "cancelled" as const };
    }

    // Idempotent (no-op nếu đã set trước đó) — KHÔNG set khi DISPUTED (vẫn
    // cho xem lại nội dung bình thường, chỉ không tính đây là "nhận hàng
    // mới" trong lúc đang tranh chấp, khớp luật cũ của confirm-received).
    const receipt = await markReceivedIfNeeded(tx, item);

    // Ghi vết TRƯỚC khi transaction commit — thất bại thì rollback cả 2
    // (không set được receivedAt lẫn không trả nội dung), fail-closed.
    await tx.deliveredPayloadAccessLog.create({
      data: { orderItemId: item.id, buyerId: session!.user.id, ipAddress: clientIp(req) },
    });

    return { kind: "ok" as const, item, receipt };
  });

  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  }
  if (result.kind === "cancelled") {
    return NextResponse.json(
      { error: "Đơn hàng đã được hoàn tiền toàn bộ, không thể xem lại nội dung đã giao." },
      { status: 400 }
    );
  }

  const { item, receipt } = result;

  // TOOL: credential mã hoá at-rest — giải mã SAU KHI transaction đã commit
  // (thuần tính toán, không đụng DB — không cần giữ trong transaction, giữ
  // transaction ngắn gọn). Lỗi giải mã (khoá đổi/dữ liệu hỏng) → 500 chung
  // chung, KHÔNG lộ chi tiết lỗi gốc — cố tình KHÔNG rollback receivedAt đã
  // set: đây là lỗi hệ thống lúc giải mã, không phải lý do để "chưa nhận
  // hàng" (nội dung ĐÃ tồn tại thật trong kho, chỉ là tạm không giải mã được).
  let deliveredPayload = item.deliveredPayload;
  if (deliveredPayload && item.deliveredPayloadEncryption) {
    try {
      const contents: string[] = JSON.parse(deliveredPayload);
      const encryptionMeta: ({ iv: string; authTag: string } | null)[] = JSON.parse(
        item.deliveredPayloadEncryption
      );
      const decrypted = contents.map((content, i) => {
        const meta = encryptionMeta[i];
        if (!meta) return content;
        return decryptSensitiveFields({ ciphertext: content, iv: meta.iv, authTag: meta.authTag })
          .content;
      });
      deliveredPayload = JSON.stringify(decrypted);
    } catch {
      return NextResponse.json(
        { error: "Không thể giải mã thông tin — vui lòng liên hệ hỗ trợ." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    // null nghĩa là dòng hàng này không có nội dung tự động (vd dịch vụ —
    // buyer cung cấp thông tin CHO seller, không nhận gì từ hệ thống) —
    // buyer vẫn được ghi nhận "đã nhận hàng" ở bước trên, chỉ không có gì
    // để hiển thị. Client (DeliveredPayloadButton) tự phân biệt qua giá trị
    // null này, không còn coi đây là lỗi.
    deliveredPayload,
    deliveredExpiresAt: item.deliveredExpiresAt,
    // TOOL: quy trình sử dụng đầy đủ — plaintext, gửi kèm credential đã giải
    // mã trong CÙNG response (1 lượt xem = 1 dòng log, đủ cho cả 2 phần).
    usageGuide: item.product?.productType === "TOOL" ? item.product.toolUsageGuide : undefined,
    // receipt = null khi đã set từ trước (idempotent) hoặc không đủ điều
    // kiện (DISPUTED) — client dùng để biết có nên router.refresh() lại
    // dòng bảo hành hay không (đỡ refresh vô ích khi xem lại lần 2 trở đi).
    justReceived: receipt !== null,
  });
}
