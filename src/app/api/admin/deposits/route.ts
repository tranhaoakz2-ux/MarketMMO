import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { expireStaleBankDeposits, isBankManualApprovalEnabled } from "@/lib/payment/deposit";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Sweep trước khi liệt kê — hàng chờ admin luôn phản ánh đúng lệnh nào
  // thật sự còn hiệu lực, không hiện lệnh đã quá 15 phút mà buyer chưa từng
  // poll trang của họ.
  await expireStaleBankDeposits();

  const bankManualApprovalEnabled = await isBankManualApprovalEnabled();

  const deposits = await prisma.walletTransaction.findMany({
    where: { type: "DEPOSIT" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      note: true,
      gatewayRef: true,
      createdAt: true,
      user: { select: { email: true, username: true, name: true } },
    },
  });

  return NextResponse.json({ deposits, bankManualApprovalEnabled });
}
