import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSellerWalletHistory } from "@/lib/queries";

const MIN_WITHDRAW_AMOUNT = 50000;

export async function POST(req: Request) {
  const { session, error } = await requireSeller();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const bankName = typeof body?.bankName === "string" ? body.bankName.trim().slice(0, 100) : "";
  const accountNumber =
    typeof body?.accountNumber === "string" ? body.accountNumber.trim().slice(0, 50) : "";
  const accountHolder =
    typeof body?.accountHolder === "string" ? body.accountHolder.trim().slice(0, 100) : "";

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < MIN_WITHDRAW_AMOUNT) {
    return NextResponse.json(
      { error: `Số tiền rút tối thiểu là ${MIN_WITHDRAW_AMOUNT.toLocaleString("vi-VN")}đ.` },
      { status: 400 }
    );
  }
  if (!bankName || !accountNumber || !accountHolder) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ ngân hàng, số tài khoản và chủ tài khoản nhận tiền." },
      { status: 400 }
    );
  }

  try {
    // Trừ ví NGAY khi tạo yêu cầu (khác luồng nạp tiền) — khoá số tiền này lại
    // để seller không thể tạo nhiều yêu cầu rút / dùng số dư này vào việc khác
    // (đặt giá đấu, mua hàng) trong lúc chờ admin duyệt. Nếu admin từ chối, số
    // tiền được hoàn lại ở route duyệt (xem admin/withdrawals/[id]/route.ts).
    const tx = await prisma.$transaction(async (t) => {
      const user = await t.user.findUniqueOrThrow({ where: { id: session!.user.id } });
      if (user.walletBalance < amount) {
        throw new Error("Số dư ví không đủ để rút số tiền này.");
      }

      await t.user.update({
        where: { id: user.id },
        data: { walletBalance: { decrement: amount } },
      });

      return t.walletTransaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAW",
          amount: -amount,
          status: "PENDING",
          note: `Rút về: ${bankName} - ${accountNumber} - ${accountHolder}`,
        },
      });
    });

    return NextResponse.json({ id: tx.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo yêu cầu rút tiền.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const { session, error } = await requireSeller();
  if (error) return error;

  const withdrawals = await getSellerWalletHistory(session!.user.id, "WITHDRAW");
  return NextResponse.json({ withdrawals });
}
