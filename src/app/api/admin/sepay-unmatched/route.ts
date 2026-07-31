import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách giao dịch SePay KHÔNG khớp được mã đơn nào (webhook về nhưng
// không tìm thấy WalletTransaction PENDING nào có mã trùng trong nội dung
// chuyển khoản) — admin tự đối chiếu rồi gán cho đúng buyer tại
// POST /api/admin/sepay-unmatched/[id].
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await prisma.sepayUnmatchedTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ transactions: rows });
}
