import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createVnpayPaymentUrl, isVnpayConfigured } from "@/lib/payment/vnpay";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isVnpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "VNPay chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET trong .env). Vui lòng dùng nạp tiền thủ công.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  // Bug B10: ép số nguyên + đặt trần (đồng bộ với validate nạp thủ công/rút) —
  // tránh số lẻ VNĐ và giá trị vô lý.
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 10000) {
    return NextResponse.json(
      { error: "Số tiền nạp tối thiểu là 10.000đ (số nguyên)." },
      { status: 400 }
    );
  }
  if (amount > 200_000_000) {
    return NextResponse.json(
      { error: "Số tiền nạp mỗi lần tối đa là 200.000.000đ." },
      { status: 400 }
    );
  }

  const tx = await prisma.walletTransaction.create({
    data: {
      userId: session!.user.id,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
      method: "VNPAY",
    },
  });

  const ipAddr =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  try {
    const url = createVnpayPaymentUrl({
      amount,
      txnRef: tx.id,
      orderInfo: `Nap tien vi MarketMMO - ${tx.id}`,
      ipAddr,
    });
    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: { gatewayRef: tx.id },
    });
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo URL thanh toán.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
