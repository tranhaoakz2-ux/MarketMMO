import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decryptSensitiveFields } from "@/lib/service-crypto";
import { logCredentialAccess } from "@/lib/service-intake";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Giải mã + trả field nhạy cảm (mật khẩu/OTP) của 1 đơn dịch vụ cho seller —
// CHỈ khi: đã "Nhận đơn" (sellerAcceptedAt != null), còn trong cửa sổ xem
// (now <= sensitiveRevealDeadline), và CHƯA bị xoá cứng (sensitivePurgedAt ==
// null, xem purgeServiceIntakeSecrets() trong src/lib/service-intake.ts).
// Mỗi lần gọi thành công (kể cả xem lại) đều ghi 1 dòng
// ServiceCredentialAccessLog — không cache/short-circuit theo lần xem trước.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { orderItemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { serviceIntake: true },
  });
  if (!item || !item.serviceIntake) {
    return NextResponse.json({ error: "Không tìm thấy đơn dịch vụ." }, { status: 404 });
  }
  if (item.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Đơn hàng này không thuộc gian hàng của bạn." }, { status: 403 });
  }

  const intake = item.serviceIntake;
  if (!intake.sellerAcceptedAt) {
    return NextResponse.json(
      { error: "Vui lòng bấm \"Nhận đơn\" trước khi xem thông tin đăng nhập." },
      { status: 400 }
    );
  }
  if (intake.sensitivePurgedAt) {
    return NextResponse.json(
      { error: "Thông tin nhạy cảm của đơn này đã được xoá do đơn đã hoàn tất." },
      { status: 400 }
    );
  }
  if (intake.sensitiveRevealDeadline && intake.sensitiveRevealDeadline < new Date()) {
    return NextResponse.json(
      { error: "Đã quá thời hạn xem thông tin đăng nhập cho đơn này." },
      { status: 400 }
    );
  }

  const publicFields = intake.publicFields ? JSON.parse(intake.publicFields) : {};

  // Nhãn hiển thị (label) cho từng fieldKey — chỉ để UI seller đọc dễ hơn
  // (publicFields/secretFields lưu theo fieldKey, vd "mat_khau", không phải
  // nhãn gốc "Mật khẩu"). Không ảnh hưởng gì tới việc mã hoá/audit ở trên.
  const fieldDefs = await prisma.serviceFieldDefinition.findMany({
    where: { productId: item.productId },
    select: { fieldKey: true, label: true },
  });
  const fieldLabels = Object.fromEntries(fieldDefs.map((f) => [f.fieldKey, f.label]));

  if (!intake.encryptedFields || !intake.encryptionIv || !intake.encryptionAuthTag) {
    // Dịch vụ này không có field "secret" nào (chỉ toàn field thường) —
    // không có gì để giải mã, không cần ghi audit log.
    return NextResponse.json({ publicFields, secretFields: {}, fieldLabels });
  }

  let secretFields: Record<string, string>;
  try {
    secretFields = decryptSensitiveFields({
      ciphertext: intake.encryptedFields,
      iv: intake.encryptionIv,
      authTag: intake.encryptionAuthTag,
    });
  } catch {
    // KHÔNG log chi tiết lỗi gốc (có thể vô tình chứa dữ liệu nhạy cảm trong
    // stack trace của thư viện crypto) — chỉ trả lỗi chung.
    return NextResponse.json(
      { error: "Không thể giải mã thông tin — vui lòng liên hệ hỗ trợ." },
      { status: 500 }
    );
  }

  await logCredentialAccess({
    serviceIntakeId: intake.id,
    sellerId: seller!.id,
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ publicFields, secretFields, fieldLabels });
}
