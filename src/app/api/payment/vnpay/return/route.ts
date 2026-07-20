import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyVnpayReturn } from "@/lib/payment/vnpay";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const redirectBase = new URL("/nap-tien", url.origin);

  const valid = verifyVnpayReturn(query);
  if (!valid) {
    redirectBase.searchParams.set("status", "invalid_signature");
    return NextResponse.redirect(redirectBase);
  }

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;

  const tx = await prisma.walletTransaction.findUnique({ where: { id: txnRef } });
  if (!tx || tx.type !== "DEPOSIT") {
    redirectBase.searchParams.set("status", "not_found");
    return NextResponse.redirect(redirectBase);
  }
  // Đã xử lý rồi (không còn PENDING) → coi như thành công/thất bại đã ghi, KHÔNG
  // cộng lại tiền (idempotent). Bug B2: trước đây bước kiểm này nằm ngoài update
  // nên replay đồng thời có thể cộng nhiều lần.
  if (tx.status !== "PENDING") {
    redirectBase.searchParams.set("status", tx.status === "CONFIRMED" ? "success" : "failed");
    return NextResponse.redirect(redirectBase);
  }

  // Đối chiếu số tiền VNPay báo về khớp số đã yêu cầu (bug B8). Không khớp thì
  // từ chối, không cộng ví (dù chữ ký đã hợp lệ) — phòng bất thường phía cổng.
  if (Number(query.vnp_Amount) !== tx.amount * 100) {
    await prisma.walletTransaction.updateMany({
      where: { id: tx.id, status: "PENDING" },
      data: { status: "REJECTED", adminNote: `Sai số tiền: vnp_Amount=${query.vnp_Amount}, expected=${tx.amount * 100}` },
    });
    redirectBase.searchParams.set("status", "failed");
    return NextResponse.redirect(redirectBase);
  }

  if (responseCode === "00") {
    // Gate NGUYÊN TỬ (bug B2): chỉ request THẮNG được updateMany (count===1,
    // chuyển PENDING→CONFIRMED) mới cộng ví. Replay đồng thời: các request kia
    // count===0 → không cộng. Cả 2 lệnh trong 1 $transaction.
    const credited = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id: tx.id, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: tx.amount } },
      });
      return true;
    });
    redirectBase.searchParams.set("status", credited ? "success" : "already_processed");
  } else {
    await prisma.walletTransaction.updateMany({
      where: { id: tx.id, status: "PENDING" },
      data: { status: "REJECTED", adminNote: `VNPay response code: ${responseCode}` },
    });
    redirectBase.searchParams.set("status", "failed");
  }

  return NextResponse.redirect(redirectBase);
}
