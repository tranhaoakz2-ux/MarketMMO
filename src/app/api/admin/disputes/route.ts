import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // CHỈ select đúng field panel khiếu nại cần hiển thị — KHÔNG dùng `include`
  // (vốn kéo TOÀN BỘ scalar của OrderItem, gồm cả `deliveredPayload` = nội
  // dung tài khoản/2FA đã giao) để dữ liệu tối mật không rò ra client cho mọi
  // đơn. Nếu admin cần xem nội dung đã giao để xử khiếu nại, dùng hành động
  // riêng có ghi audit: GET /api/admin/disputes/[id]/delivered. Xem
  // SECURITY_AUDIT.md #7.
  const disputes = await prisma.dispute.findMany({
    // Admin thấy khiếu nại đã escalate lên sàn (phase PLATFORM) VÀ khiếu nại
    // "bảo hành sau giải ngân" (POST_RELEASE_WARRANTY, đi thẳng admin không
    // qua bước seller tự bảo hành). Khiếu nại đang ở pha bảo hành seller
    // (SELLER_WARRANTY, đơn còn ESCROW) chưa thuộc thẩm quyền admin —
    // SECURITY_AUDIT #8 Phần B. (Dispute cũ có phase mặc định PLATFORM nên
    // vẫn hiện bình thường.)
    where: { phase: { in: ["PLATFORM", "POST_RELEASE_WARRANTY"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      phase: true,
      createdAt: true,
      openedBy: { select: { email: true, username: true, name: true } },
      orderItem: {
        select: {
          productName: true,
          price: true,
          quantity: true,
          product: {
            select: { seller: { select: { shopName: true, insuranceBalance: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json({ disputes });
}
