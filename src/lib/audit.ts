import { prisma } from "@/lib/prisma";

// Ghi 1 dòng vào AdminAuditLog — gọi ở CUỐI mỗi route admin sau khi hành
// động chính đã thành công. Cố tình KHÔNG throw nếu ghi log lỗi (không được
// để sự cố ghi audit làm hỏng 1 thao tác admin đã thực hiện xong, vd đã
// giải ngân tiền thật) — chỉ log ra console để dev biết nếu có lỗi.
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: string;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail,
      },
    });
  } catch (err) {
    console.error("logAdminAction failed", err);
  }
}
