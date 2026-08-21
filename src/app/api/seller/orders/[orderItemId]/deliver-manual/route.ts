import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logOrderStatusChange } from "@/lib/order-status-history";
import { encryptSensitiveFields } from "@/lib/service-crypto";

const MAX_FIELD_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

// Seller nhập thông tin đăng nhập VPS/Server cho 1 đơn MANUAL_PROVISION —
// mã hoá NGUYÊN 1 blob AES-256-GCM (KHÔNG bao giờ lưu/log plaintext), lưu
// vào ĐÚNG 2 cột deliveredPayload/deliveredPayloadEncryption đã có (mảng 1
// phần tử vì quantity luôn ép =1 lúc checkout) — tái dùng nguyên cơ chế giải
// mã generic ở POST /api/orders/[id]/reveal-delivered, KHÔNG cần sửa gì
// thêm ở đó ngoài 1 guard riêng (xem route đó).
//
// Gate NGUYÊN TỬ trên chính lệnh UPDATE — bắt buộc CÒN TRONG HẠN
// (manualDeliveryDeadline > now) VÀ status vẫn "AWAITING_SELLER_DELIVERY" —
// chặn đúng race với job quét quá hạn (refundOverdueManualProvisionItems(),
// src/lib/manual-provision.ts, chạy trong GET /api/cron/daily): nếu deadline
// đã qua, WHERE không khớp, seller nhận lỗi rõ ràng thay vì âm thầm giao vào
// 1 đơn sắp/đã bị hoàn tiền — chỉ 1 trong 2 bên thắng.
//
// Chuyển THẲNG status "AWAITING_SELLER_DELIVERY" → "ESCROW" (KHÔNG có trạng
// thái "DELIVERED" riêng) — mọi logic sau đó (buyer bấm lộ hàng, bắt đầu bảo
// hành, giữ ký quỹ tới hết bảo hành, giải ngân) dùng lại NGUYÊN trạng thái
// ESCROW đã có, không cần sửa warranty.ts/escrow.ts.
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
  if (item.status !== "AWAITING_SELLER_DELIVERY") {
    return NextResponse.json(
      { error: "Đơn hàng này không còn ở trạng thái chờ giao thủ công (đã giao/huỷ/hoàn tiền)." },
      { status: 400 }
    );
  }
  if (item.manualDeliveryDeadline && item.manualDeliveryDeadline <= new Date()) {
    return NextResponse.json(
      {
        error:
          "Đã quá hạn giao cam kết — đơn này sẽ được hệ thống tự động hoàn tiền cho người mua, không thể giao nữa.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const field = (key: string, max: number, required: boolean): string | null => {
    const raw = typeof body?.[key] === "string" ? body[key].trim() : "";
    if (!raw) {
      if (required) throw new Error(`missing:${key}`);
      return null;
    }
    if (raw.length > max) throw new Error(`toolong:${key}`);
    return raw;
  };

  let credential: {
    ip: string;
    port: string;
    username: string;
    password: string;
    sshKey: string | null;
    notes: string | null;
  };
  try {
    credential = {
      ip: field("ip", MAX_FIELD_LENGTH, true)!,
      port: field("port", MAX_FIELD_LENGTH, true)!,
      username: field("username", MAX_FIELD_LENGTH, true)!,
      password: field("password", MAX_FIELD_LENGTH, true)!,
      sshKey: field("sshKey", MAX_FIELD_LENGTH, false),
      notes: field("notes", MAX_NOTES_LENGTH, false),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("missing:")) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ IP, Port, Username, Password." },
        { status: 400 }
      );
    }
    if (msg.startsWith("toolong:")) {
      return NextResponse.json({ error: "Có trường vượt quá độ dài cho phép." }, { status: 400 });
    }
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  // Định dạng THÀNH 1 khối văn bản đọc được (hiển thị qua DeliveredPayloadButton
  // mode="guide" — whitespace-pre-wrap) TRƯỚC khi mã hoá — không lưu object
  // JSON thô cho buyer đọc, tránh phải sửa UI hiển thị.
  const lines = [
    `IP: ${credential.ip}`,
    `Port: ${credential.port}`,
    `Username: ${credential.username}`,
    `Password: ${credential.password}`,
    credential.sshKey ? `SSH Key: ${credential.sshKey}` : null,
    credential.notes ? `Ghi chú: ${credential.notes}` : null,
  ].filter((l): l is string => l !== null);
  const content = lines.join("\n");

  let blob: ReturnType<typeof encryptSensitiveFields>;
  try {
    blob = encryptSensitiveFields({ content });
  } catch {
    // KHÔNG log chi tiết lỗi gốc (tránh rò rỉ thông tin nội bộ) — fail-closed
    // bắt buộc khi thiếu SERVICE_CREDENTIAL_ENCRYPTION_KEY, xem service-crypto.ts.
    return NextResponse.json(
      { error: "Hệ thống chưa cấu hình mã hoá, không thể giao thông tin lúc này." },
      { status: 500 }
    );
  }

  const deliveredPayload = JSON.stringify([blob.ciphertext]);
  const deliveredPayloadEncryption = JSON.stringify([
    { iv: blob.iv, authTag: blob.authTag, keyVersion: blob.keyVersion },
  ]);

  const done = await prisma.$transaction(async (tx) => {
    const gate = await tx.orderItem.updateMany({
      where: {
        id: orderItemId,
        status: "AWAITING_SELLER_DELIVERY",
        manualDeliveryDeadline: { gt: new Date() },
      },
      data: { status: "ESCROW", deliveredPayload, deliveredPayloadEncryption },
    });
    if (gate.count === 0) return false;

    await logOrderStatusChange(tx, {
      orderItemId,
      fromStatus: "AWAITING_SELLER_DELIVERY",
      toStatus: "ESCROW",
      actor: { type: "SELLER", id: seller!.userId },
      note: "Seller nhập thông tin server",
    });
    return true;
  });

  if (!done) {
    return NextResponse.json(
      {
        error:
          "Không thể giao — đơn đã bị huỷ/hoàn tiền quá hạn hoặc đã được giao trước đó (vui lòng tải lại trang).",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
