import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSellerWalletHistory } from "@/lib/queries";

const MIN_INSURANCE_DEPOSIT = 10000;

export async function POST(req: Request) {
  const { session, seller, error } = await requireSeller();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < MIN_INSURANCE_DEPOSIT) {
    return NextResponse.json(
      { error: `Số tiền nạp tối thiểu là ${MIN_INSURANCE_DEPOSIT.toLocaleString("vi-VN")}đ.` },
      { status: 400 }
    );
  }

  try {
    // Đây là chuyển tiền NỘI BỘ giữa 2 ví của cùng 1 seller đã xác nhận trong hệ
    // thống (ví chính -> quỹ bảo hiểm), không phải tiền từ/đến ngân hàng ngoài —
    // an toàn hơn rút tiền nhiều nên tự động duyệt ngay, không cần admin.
    await prisma.$transaction(async (t) => {
      // Trừ ví CÓ ĐIỀU KIỆN + nguyên tử (bug B1): chặn 2 lần nạp quỹ song song
      // cùng tiêu vượt số dư. count=0 → throw, rollback.
      const dec = await t.user.updateMany({
        where: { id: session!.user.id, walletBalance: { gte: amount } },
        data: { walletBalance: { decrement: amount } },
      });
      if (dec.count === 0) {
        throw new Error("Số dư ví không đủ để nạp số tiền này.");
      }

      await t.seller.update({
        where: { id: seller!.id },
        data: { insuranceBalance: { increment: amount } },
      });
      await t.walletTransaction.create({
        data: {
          userId: session!.user.id,
          type: "INSURANCE_DEPOSIT",
          amount: -amount,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          note: "Nạp quỹ bảo hiểm",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể nạp quỹ bảo hiểm.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const { session, error } = await requireSeller();
  if (error) return error;

  const deposits = await getSellerWalletHistory(session!.user.id, "INSURANCE_DEPOSIT");
  return NextResponse.json({ deposits });
}
