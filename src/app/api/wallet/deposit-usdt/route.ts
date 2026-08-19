import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getUsdtInfo } from "@/lib/payment/deposit";
import { verifyUsdtDeposit } from "@/lib/payment/tron-verify";
import { rateLimit } from "@/lib/rate-limit";

const TXID_REGEX = /^[0-9a-fA-F]{64}$/;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

class IntentAlreadyMatchedError extends Error {}

// Nạp USDT (TRC20) TỰ ĐỘNG — buyer dán TxID SAU KHI đã tạo 1
// UsdtDepositIntent (POST .../deposit-usdt/intent) và chuyển ĐÚNG số USDT
// định danh đã cấp. Số tiền KHÔNG tự khai — lấy từ chính blockchain (xem
// src/lib/payment/tron-verify.ts) rồi KHỚP với intent, không tin theo
// người gọi API.
//
// VÁ LAUNCH_AUDIT.md #1 (2026-08-19): trước đây route này cộng ví THẲNG
// cho bất kỳ ai gọi API kèm TxID hợp lệ — TxID + số tiền + địa chỉ gửi đều
// CÔNG KHAI trên Tronscan, nên ai theo dõi ví sàn cũng "cướp" được TxID
// của người khác vừa chuyển để tự nhận tiền. Giờ tiền LUÔN cộng vào ví
// CHỦ YÊU CẦU (UsdtDepositIntent.userId) — khớp thuần theo số USDT THỰC
// NHẬN trên chain với đúng 1 intent đang PENDING, KHÔNG PHỤ THUỘC ai gọi
// route xác nhận này. Cướp TxID gọi API bằng tài khoản khác không được
// cộng gì, vì tài khoản đó không có intent nào khớp đúng số tiền đó.
//
// 3 nhánh kết quả:
//  - Xác minh on-chain THẤT BẠI (sai contract, sai ví nhận, chưa đủ xác
//    nhận, TronGrid lỗi mạng...) -> KHÔNG cộng gì, tạo 1 bản ghi PENDING
//    amount=0 cho admin xem lại thủ công.
//  - Xác minh THÀNH CÔNG nhưng KHÔNG khớp intent PENDING nào (gửi sai số/
//    intent đã hết hạn/chưa từng tạo yêu cầu) -> cũng KHÔNG tự cộng cho
//    AI, tạo bản ghi PENDING amount=0 kèm senderAddress on-chain cho admin
//    đối chiếu — đây là điểm mấu chốt của bản vá: không còn nhánh nào cộng
//    thẳng cho người gọi API chỉ vì TxID hợp lệ.
//  - Xác minh THÀNH CÔNG và khớp đúng 1 intent PENDING -> cộng ví CHỦ
//    INTENT (có thể khác người gọi API xác nhận), dựa UNIQUE INDEX của DB
//    (WalletTransaction_usdt_deposit_txid_key) + gate nguyên tử trên chính
//    intent (status PENDING -> MATCHED) chống race/double-credit.
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

  // Đã xác minh CHẮC CHẮN có usdtAmount thật trên chain — giờ khớp với đúng
  // 1 UsdtDepositIntent đang PENDING theo usdtAmountRaw (KHÔNG lọc theo
  // userId — chủ đích: tiền phải về đúng chủ intent bất kể ai gọi route
  // này). Không khớp -> KHÔNG cộng cho ai, rơi về PENDING cho admin.
  const matchedIntent = await prisma.usdtDepositIntent.findFirst({
    where: { usdtAmountRaw: verified.usdtAmountRaw, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  if (!matchedIntent) {
    try {
      await prisma.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount: 0,
          status: "PENDING",
          method: "usdt",
          gatewayRef: txid,
          note: `Đã xác minh on-chain ${verified.usdtAmount} USDT thật${
            verified.senderAddress ? ` từ ví ${verified.senderAddress}` : ""
          } nhưng KHÔNG khớp yêu cầu nạp tiền nào đang chờ (yêu cầu có thể đã hết hạn hoặc gửi sai số USDT định danh) — cần admin đối chiếu thủ công.`,
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
      message:
        "Đã xác minh giao dịch trên blockchain nhưng không khớp với yêu cầu nạp tiền nào đang chờ (có thể đã hết hạn hoặc gửi sai số USDT). Yêu cầu đã được ghi nhận, liên hệ admin nếu chờ lâu.",
    });
  }

  let walletTransactionId: string;
  try {
    walletTransactionId = await prisma.$transaction(async (t) => {
      // Gate nguyên tử trên chính intent — chống 2 request cùng khớp 1
      // intent (về lý thuyết cần 2 TxID khác nhau cùng mang đúng
      // usdtAmountRaw, cực hiếm, nhưng vẫn gate cho chắc).
      const gate = await t.usdtDepositIntent.updateMany({
        where: { id: matchedIntent.id, status: "PENDING" },
        data: { status: "MATCHED", matchedTxid: txid },
      });
      if (gate.count === 0) throw new IntentAlreadyMatchedError();

      const walletTx = await t.walletTransaction.create({
        data: {
          userId: matchedIntent.userId,
          type: "DEPOSIT",
          amount: matchedIntent.vndAmount,
          status: "CONFIRMED",
          method: "usdt",
          gatewayRef: txid,
          note: `Nạp ${verified.usdtAmount} USDT (đã xác minh on-chain, khớp yêu cầu #${matchedIntent.id.slice(-8)}, tỷ giá lúc tạo yêu cầu ${matchedIntent.rate.toLocaleString("vi-VN")}đ/USDT, nguồn ${matchedIntent.rateSource})${
            verified.senderAddress ? ` từ ví ${verified.senderAddress}` : ""
          }`,
          confirmedAt: new Date(),
        },
      });
      await t.usdtDepositIntent.update({
        where: { id: matchedIntent.id },
        data: { matchedWalletTransactionId: walletTx.id },
      });
      await t.user.update({
        where: { id: matchedIntent.userId },
        data: { walletBalance: { increment: matchedIntent.vndAmount } },
      });
      return walletTx.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Mã giao dịch này đã được dùng để nạp tiền trước đó." },
        { status: 400 }
      );
    }
    if (err instanceof IntentAlreadyMatchedError) {
      return NextResponse.json(
        {
          error:
            "Yêu cầu nạp tiền này vừa được xử lý bởi 1 giao dịch khác. Nếu bạn chưa được cộng tiền, vui lòng liên hệ admin.",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({
    ok: true,
    credited: matchedIntent.vndAmount,
    usdtAmount: verified.usdtAmount,
    // false khi TxID khớp intent của MỘT NGƯỜI KHÁC (vd bị cướp TxID rồi bị
    // chặn) — tiền vẫn được cộng đúng cho chủ intent, chỉ KHÔNG PHẢI người
    // gọi route này, nên client cần hiển thị đúng thông báo, không ngộ nhận
    // "tiền vừa vào ví tôi".
    creditedToSelf: matchedIntent.userId === userId,
    walletTransactionId,
  });
}
