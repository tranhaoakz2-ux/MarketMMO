import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export type ServiceFieldDef = {
  fieldKey: string;
  label: string;
  inputType: string;
  required: boolean;
};

// Tách giá trị buyer nhập thành 2 nhóm theo `inputType` của field definition
// — "secret" là NGUỒN DUY NHẤT xác định nhạy cảm (xem ghi chú trong
// prisma/schema.prisma > ServiceFieldDefinition). Validate luôn field
// required còn thiếu ở đây để checkout/route gọi 1 hàm duy nhất.
export function splitServiceFieldValues(
  fieldDefs: ServiceFieldDef[],
  rawValues: Record<string, unknown>
): { publicFields: Record<string, string>; secretFields: Record<string, string>; missingLabels: string[] } {
  const publicFields: Record<string, string> = {};
  const secretFields: Record<string, string> = {};
  const missingLabels: string[] = [];

  for (const def of fieldDefs) {
    const raw = rawValues[def.fieldKey];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (def.required) missingLabels.push(def.label);
      continue;
    }
    if (def.inputType === "secret") {
      secretFields[def.fieldKey] = value;
    } else {
      publicFields[def.fieldKey] = value;
    }
  }

  return { publicFields, secretFields, missingLabels };
}

// Xoá cứng field nhạy cảm của 1 đơn dịch vụ — gọi VÔ ĐIỀU KIỆN tại mọi điểm
// OrderItem rời trạng thái ESCROW (escrow/release, fullRefundDispute,
// partial_refund, release_seller): an toàn gọi cho cả đơn KHÔNG phải dịch vụ
// (updateMany không khớp dòng nào thì không làm gì) và tự idempotent
// (where sensitivePurgedAt: null — gọi lại không lỗi, không ghi đè lần 2).
// Không xoá publicFields/preHandoffSnapshot (không phải bí mật, giữ làm
// lịch sử đơn hàng).
export async function purgeServiceIntakeSecrets(db: Db, orderItemId: string): Promise<void> {
  await db.serviceIntake.updateMany({
    where: { orderItemId, sensitivePurgedAt: null },
    data: {
      encryptedFields: null,
      encryptionIv: null,
      encryptionAuthTag: null,
      encryptionKeyVersion: null,
      sensitivePurgedAt: new Date(),
    },
  });
}

// Audit: mỗi lần seller giải mã/xem field nhạy cảm — ghi THÊM 1 dòng (không
// ghi đè), kể cả xem lại nhiều lần cùng 1 đơn.
export async function logCredentialAccess(params: {
  serviceIntakeId: string;
  sellerId: string;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.serviceCredentialAccessLog.create({
    data: {
      serviceIntakeId: params.serviceIntakeId,
      sellerId: params.sellerId,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
