import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getUsdtInfo } from "@/lib/payment/deposit";
import { getLiveUsdtVndRate } from "@/lib/payment/exchange-rate";
import { verifyUsdtDeposit } from "@/lib/payment/tron-verify";
import { rateLimit } from "@/lib/rate-limit";

const TXID_REGEX = /^[0-9a-fA-F]{64}$/;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Nạp USDT (TRC20) TỰ ĐỘNG — buyer CHỈ dán TxID, KHÔNG tự khai số tiền (số
// tiền THẬT lấy từ chính blockchain, xem src/lib/payment/tron-verify.ts).
// 2 nhánh kết quả:
//  - Xác minh on-chain THÀNH CÔNG -> cộng ví NGAY trong cùng request, dựa
//    vào UNIQUE INDEX của DB (WalletTransaction_usdt_deposit_txid_key, xem
//    prisma/pending-sql/2026-07-31-usdt-deposit-auto-verify.sql) làm lớp
//    chống race-condition THẬT SỰ — 2 request cùng TxID chạy song song, 1
//    lệnh insert thắng, lệnh còn lại nhận lỗi unique-violation (P2002) và bị
//    từ chối sạch sẽ, KHÔNG rollback nhầm giao dịch đã thắng.
//  - Xác minh THẤT BẠI (bất kỳ lý do gì: sai contract, sai ví nhận, chưa đủ
//    xác nhận, TronGrid lỗi mạng...) -> KHÔNG cộng gì cả, chỉ tạo 1 bản ghi
//    PENDING amount=0 cho admin xem lại thủ công (phương án dự phòng) — thà
//    chậm còn hơn cộng nhầm.
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const limited = rateLimit(`usdt-deposit:${userId}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const txid = typeof body?.txid === "string" ? body.txid.trim().replace(/^0x/i, "").toLowerCase() : "";
  if (!TXID_REGEX.test(txid)) {
    return NextResponse.json({ error: "Mã giao dịch (TxID) không đúng định dạng." }, { status: 400 });
  }

  const usdtInfo = await getUsdtInfo();
  if (!usdtInfo) {
    return NextResponse.json({ error: "Nạp tiền bằng USDT chưa được bật." }, { status: 503 });
  }

  // Kiểm tra nhanh TxID đã dùng chưa (UX rõ ràng ngay, không tốn 1 lượt gọi
  // TronGrid vô ích) — lớp chống race-condition THẬT SỰ vẫn là unique index
  // lúc insert bên dưới, đây chỉ là fast-path.
  const existing = await prisma.walletTransaction.findFirst({
    where: { type: "DEPOSIT", method: "usdt", gatewayRef: txid },
    select: { status: true },
  });
  if (existing) {
    if (existing.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Mã giao dịch này đã được dùng để nạp tiền trước đó." },
        { status: 400 }
      );
    }
    if (existing.status === "PENDING") {
      return NextResponse.json(
        { error: "Mã giao dịch này đang chờ admin xác minh thủ công, vui lòng đợi." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Mã giao dịch này đã bị từ chối trước đó. Liên hệ admin nếu có thắc mắc." },
      { status: 400 }
    );
  }

  const verified = await verifyUsdtDeposit(txid, usdtInfo.address);

  if (!verified.ok) {
    try {
      await prisma.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount: 0,
          status: "PENDING",
          method: "usdt",
          gatewayRef: txid,
          note: `Chờ admin xác minh thủ công — tự động thất bại: ${verified.reason}`,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return NextResponse.json({ error: "Mã giao dịch này đã được gửi trước đó." }, { status: 400 });
      }
      throw err;
    }
    return NextResponse.json({
      pending: true,
      message: "Chưa thể xác minh tự động lúc này. Yêu cầu đã được ghi nhận, liên hệ admin nếu chờ lâu.",
    });
  }

  // Đã xác minh CHẮC CHẮN có usdtAmount thật trên chain — nếu lấy tỷ giá lỗi
  // vẫn KHÔNG được để mất giao dịch hợp lệ này: rơi về PENDING (thay vì
  // reject) để admin tự nhập VNĐ, không bắt buyer gửi lại TxID.
  let rate: number;
  let source: "coingecko" | "fallback";
  try {
    ({ rate, source } = await getLiveUsdtVndRate());
  } catch {
    try {
      await prisma.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount: 0,
          status: "PENDING",
          method: "usdt",
          gatewayRef: txid,
          note: `Đã xác minh on-chain ĐỦ ĐIỀU KIỆN: ${verified.usdtAmount} USDT thật — nhưng không lấy được tỷ giá lúc này, cần admin nhập số VNĐ thủ công.`,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return NextResponse.json({ error: "Mã giao dịch này đã được gửi trước đó." }, { status: 400 });
      }
      throw err;
    }
    return NextResponse.json({
      pending: true,
      message: "Đã xác minh giao dịch thành công nhưng chưa lấy được tỷ giá — admin sẽ cộng tiền thủ công trong ít phút.",
    });
  }

  const vndAmount = Math.floor(verified.usdtAmount * rate);
  if (!(vndAmount > 0)) {
    return NextResponse.json({ error: "Số tiền quy đổi không hợp lệ." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (t) => {
      await t.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount: vndAmount,
          status: "CONFIRMED",
          method: "usdt",
          gatewayRef: txid,
          note: `Nạp ${verified.usdtAmount} USDT (đã xác minh on-chain, tỷ giá ${rate.toLocaleString("vi-VN")}đ/USDT, nguồn ${source})${
            verified.senderAddress ? ` từ ví ${verified.senderAddress}` : ""
          }`,
          confirmedAt: new Date(),
        },
      });
      await t.user.update({ where: { id: userId }, data: { walletBalance: { increment: vndAmount } } });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Mã giao dịch này đã được dùng để nạp tiền trước đó." },
        { status: 400 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true, credited: vndAmount, usdtAmount: verified.usdtAmount, rate, source });
}
