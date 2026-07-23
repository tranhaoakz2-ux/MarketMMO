import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Xem NỘI DUNG ĐÃ GIAO (deliveredPayload — tài khoản/mật khẩu/2FA) của đơn bị
// khiếu nại. TÁCH RIÊNG khỏi GET /api/admin/disputes (danh sách) để dữ liệu
// tối mật KHÔNG đi kèm response của mọi đơn (xem SECURITY_AUDIT.md #7).
//
// Mỗi lần xem GHI AUDIT LOG (ai/đơn nào/lúc nào) — và cố tình ghi log
// FAIL-CLOSED (await + KHÔNG swallow): nếu ghi vết thất bại thì KHÔNG trả nội
// dung (throw → 500). Đây là điểm KHÁC với logAdminAction() dùng ở các route
// admin khác (vốn best-effort, không chặn hành động đã thực hiện xong) — với
// một thao tác ĐỌC dữ liệu tối mật, chính cái "vết" mới là biện pháp kiểm soát
// nên không được phép đọc mà không để lại dấu.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    select: {
      id: true,
      orderItem: {
        select: { orderId: true, productName: true, deliveredPayload: true },
      },
    },
  });
  if (!dispute) {
    return NextResponse.json({ error: "Không tìm thấy khiếu nại." }, { status: 404 });
  }

  // Ghi vết TRƯỚC khi trả nội dung. Không try/catch — lỗi ghi log => 500,
  // admin không nhận được nội dung (fail-closed, xem ghi chú đầu file).
  await prisma.adminAuditLog.create({
    data: {
      adminId: session!.user!.id,
      action: "Xem nội dung đã giao của đơn khiếu nại",
      targetType: "Dispute",
      targetId: id,
      detail: `Đơn #${dispute.orderItem.orderId} — ${dispute.orderItem.productName}`,
    },
  });

  return NextResponse.json({ deliveredPayload: dispute.orderItem.deliveredPayload });
}
