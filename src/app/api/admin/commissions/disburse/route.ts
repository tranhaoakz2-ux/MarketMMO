import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Giải ngân hoa hồng ĐỦ ĐIỀU KIỆN (status ELIGIBLE + eligibleAt <= now) vào ví
// người giới thiệu. Hỗ trợ 1 khoản (ids: [id]) hoặc theo lô (ids: [...]) hoặc
// tất cả đủ điều kiện (all: true).
//   - IDEMPOTENT: gate nguyên tử updateMany where status=ELIGIBLE → chỉ khi
//     count===1 mới cộng ví. Double-submit/bấm nhiều lần KHÔNG chi 2 lần.
//   - Cùng 1 transaction: đổi status→PAID + cộng ví + ghi WalletTransaction.
//   - Audit log từng khoản đã giải ngân.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const all = body?.all === true;
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

  if (!all && ids.length === 0) {
    return NextResponse.json({ error: "Chưa chọn khoản hoa hồng nào để giải ngân." }, { status: 400 });
  }

  const now = new Date();
  const targets = await prisma.referralCommission.findMany({
    where: {
      status: "ELIGIBLE",
      eligibleAt: { lte: now },
      ...(all ? {} : { id: { in: ids } }),
    },
    select: { id: true, referrerId: true, commissionAmount: true, orderId: true },
  });

  let disbursed = 0;
  let totalPaid = 0;
  for (const c of targets) {
    const paid = await prisma.$transaction(async (t) => {
      // Gate nguyên tử: chỉ khoản còn ELIGIBLE mới chuyển được PAID (count===1).
      const gate = await t.referralCommission.updateMany({
        where: { id: c.id, status: "ELIGIBLE" },
        data: { status: "PAID", paidAt: now, disbursedById: session!.user!.id },
      });
      if (gate.count === 0) return false;
      if (c.commissionAmount > 0) {
        await t.user.update({
          where: { id: c.referrerId },
          data: { walletBalance: { increment: c.commissionAmount } },
        });
        await t.walletTransaction.create({
          data: {
            userId: c.referrerId,
            type: "REFERRAL_BONUS",
            amount: c.commissionAmount,
            status: "CONFIRMED",
            note: `Hoa hồng giới thiệu — đơn #${c.orderId}`,
            confirmedAt: now,
          },
        });
      }
      return true;
    });
    if (paid) {
      disbursed++;
      totalPaid += c.commissionAmount;
    }
  }

  if (disbursed > 0) {
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Giải ngân hoa hồng",
      targetType: "ReferralCommission",
      detail: `Đã giải ngân ${disbursed} khoản, tổng ${totalPaid.toLocaleString("vi-VN")}đ`,
    });
  }

  return NextResponse.json({ disbursed, totalPaid });
}
