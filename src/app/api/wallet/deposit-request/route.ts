import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const method = typeof body?.method === "string" ? body.method : "bank";
  const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;
  const gatewayRef =
    typeof body?.gatewayRef === "string" && body.gatewayRef.trim()
      ? body.gatewayRef.trim().slice(0, 200)
      : null;

  if (!Number.isFinite(amount) || amount < 10000) {
    return NextResponse.json(
      { error: "Số tiền nạp tối thiểu là 10.000đ." },
      { status: 400 }
    );
  }

  if (method === "usdt" && !gatewayRef) {
    return NextResponse.json(
      { error: "Vui lòng nhập mã giao dịch (TxID) sau khi chuyển USDT." },
      { status: 400 }
    );
  }

  const tx = await prisma.walletTransaction.create({
    data: {
      userId: session!.user.id,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
      method,
      note,
      gatewayRef,
    },
  });

  return NextResponse.json({ id: tx.id });
}
