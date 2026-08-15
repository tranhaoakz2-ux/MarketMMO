import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { MIN_USDT_WITHDRAW_AMOUNT, MIN_WITHDRAW_AMOUNT } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSellerWalletHistory } from "@/lib/queries";
import { getLiveUsdtVndRate } from "@/lib/payment/exchange-rate";
import { isValidTrc20Address } from "@/lib/payment/trc20";

// Trừ ví CÓ ĐIỀU KIỆN + nguyên tử (where "walletBalance >= amount" ngay
// trong lệnh UPDATE) — 2 yêu cầu rút song song (bất kỳ tổ hợp phương thức
// nào) không thể cùng rút vượt số dư (lệnh sau count=0). Dùng chung cho cả 2
// nhánh method để không viết trùng logic đụng tiền ở nhiều nơi.
async function deductWalletOrThrow(t: Prisma.TransactionClient, userId: string, amount: number) {
  const dec = await t.user.updateMany({
    where: { id: userId, walletBalance: { gte: amount } },
    data: { walletBalance: { decrement: amount } },
  });
  if (dec.count === 0) {
    throw new Error("Số dư ví không đủ để rút số tiền này.");
  }
}

async function handleBankWithdraw(userId: string, amount: number, body: Record<string, unknown>) {
  const bankName = typeof body.bankName === "string" ? body.bankName.trim().slice(0, 100) : "";
  const accountNumber =
    typeof body.accountNumber === "string" ? body.accountNumber.trim().slice(0, 50) : "";
  const accountHolder =
    typeof body.accountHolder === "string" ? body.accountHolder.trim().slice(0, 100) : "";

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

  const recipientInfo = JSON.stringify({ bankName, accountNumber, accountHolder });

  try {
    // Trừ ví NGAY khi tạo yêu cầu (khác luồng nạp tiền) — khoá số tiền này lại
    // để seller không thể tạo nhiều yêu cầu rút / dùng số dư này vào việc khác
    // (đặt giá đấu, mua hàng) trong lúc chờ admin duyệt. Nếu admin từ chối, số
    // tiền được hoàn lại ở route duyệt (xem admin/withdrawals/[id]/route.ts).
    const tx = await prisma.$transaction(async (t) => {
      await deductWalletOrThrow(t, userId, amount);
      return t.walletTransaction.create({
        data: {
          userId,
          type: "WITHDRAW",
          amount: -amount,
          status: "PENDING",
          method: "bank",
          recipientInfo,
        },
      });
    });

    return NextResponse.json({ id: tx.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo yêu cầu rút tiền.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleUsdtWithdraw(userId: string, amount: number, body: Record<string, unknown>) {
  const address = typeof body.withdrawAddress === "string" ? body.withdrawAddress.trim() : "";

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < MIN_USDT_WITHDRAW_AMOUNT) {
    return NextResponse.json(
      { error: `Số tiền rút USDT tối thiểu là ${MIN_USDT_WITHDRAW_AMOUNT.toLocaleString("vi-VN")}đ.` },
      { status: 400 }
    );
  }
  if (!isValidTrc20Address(address)) {
    return NextResponse.json(
      { error: "Địa chỉ ví TRC20 không hợp lệ. Vui lòng kiểm tra lại." },
      { status: 400 }
    );
  }

  // Lấy tỷ giá SERVER-SIDE, KHÔNG tin số client gửi lên (client chỉ gửi lên
  // số VNĐ muốn rút) — chống giả mạo tỷ giá có lợi. Gọi TRƯỚC transaction vì
  // đây là network I/O (CoinGecko), không được giữ trong 1 DB transaction.
  let rate: number;
  let source: "coingecko" | "fallback";
  try {
    ({ rate, source } = await getLiveUsdtVndRate());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể lấy tỷ giá USDT/VNĐ.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Làm tròn XUỐNG 2 chữ số thập phân (không làm tròn lên) — tránh admin
  // phải chuyển nhiều USDT hơn giá trị VNĐ seller thực rút.
  const usdtAmount = Math.floor((amount / rate) * 100) / 100;
  if (!(usdtAmount > 0)) {
    return NextResponse.json({ error: "Số USDT quy đổi không hợp lệ." }, { status: 400 });
  }

  // recipientInfo NHÂN ĐÔI địa chỉ ví (không thay thế withdrawAddress) — chỉ
  // để trang admin có 1 đường đọc chung "thông tin tài khoản nhận" cho cả 2
  // phương thức; usdtAmount/exchangeRate/rateSource vẫn là nguồn sự thật duy
  // nhất cho phần tính toán quy đổi, không đổi.
  const recipientInfo = JSON.stringify({ address });

  try {
    // Khoá tỷ giá/số USDT VÀO ĐÚNG dòng WalletTransaction tại thời điểm này —
    // admin duyệt sau không tính lại, luôn đúng số đã khoá ở đây.
    const tx = await prisma.$transaction(async (t) => {
      await deductWalletOrThrow(t, userId, amount);
      return t.walletTransaction.create({
        data: {
          userId,
          type: "WITHDRAW",
          amount: -amount,
          status: "PENDING",
          method: "usdt_trc20",
          recipientInfo,
          withdrawAddress: address,
          usdtAmount,
          exchangeRate: rate,
          rateSource: source,
        },
      });
    });

    return NextResponse.json({ id: tx.id, usdtAmount, exchangeRate: rate, rateSource: source });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo yêu cầu rút tiền.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const { session, error } = await requireSeller();
  if (error) return error;

  const body = (await req.json().catch(() => null)) ?? {};
  const amount = Number(body.amount);
  const method = body.method === "usdt_trc20" ? "usdt_trc20" : "bank";

  if (method === "usdt_trc20") {
    return handleUsdtWithdraw(session!.user.id, amount, body);
  }
  return handleBankWithdraw(session!.user.id, amount, body);
}

export async function GET() {
  const { session, error } = await requireSeller();
  if (error) return error;

  const withdrawals = await getSellerWalletHistory(session!.user.id, "WITHDRAW");
  return NextResponse.json({ withdrawals });
}
