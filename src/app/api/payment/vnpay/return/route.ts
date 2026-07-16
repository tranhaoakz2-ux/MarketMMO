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
  if (!tx || tx.status !== "PENDING") {
    redirectBase.searchParams.set("status", "not_found");
    return NextResponse.redirect(redirectBase);
  }

  if (responseCode === "00") {
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: tx.amount } },
      }),
    ]);
    redirectBase.searchParams.set("status", "success");
  } else {
    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: { status: "REJECTED", adminNote: `VNPay response code: ${responseCode}` },
    });
    redirectBase.searchParams.set("status", "failed");
  }

  return NextResponse.redirect(redirectBase);
}
