import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentConfig } from "@/lib/payment/config";
import { getUsdtDepositRate } from "@/lib/payment/exchange-rate";
import { parseDvnetWebhookPayload, verifyDvnetSignature, type DvnetWebhookPayload } from "@/lib/payment/dvnet";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function jsonOk() {
  return NextResponse.json({ success: true }, { status: 200 });
}

// Webhook DV.net (POST /api/webhook/dvnet) — báo kết quả 1 lượt nạp tạo qua
// POST /api/wallet/deposit-dvnet. Chữ ký/payload đã đọc TRỰC TIẾP source
// dv-merchant thật (xem comment đầu src/lib/payment/dvnet.ts), KHÔNG suy đoán:
//   - Header "X-Sign" = hex(sha256(rawBody + secret)) — verifyDvnetSignature().
//   - "type" (hoặc "unconfirmed_type" nếu giao dịch chưa confirm) là 1 trong
//     PaymentReceived | PaymentNotConfirmed | PaymentAMLBlocked |
//     WithdrawalFromProcessingReceived — CHỈ PaymentReceived mới cộng tiền.
//   - "wallet.store_external_id" = depositCode ta tự sinh lúc tạo yêu cầu,
//     dùng khớp NGUYÊN VĂN về đúng WalletTransaction (không suy đoán qua nội
//     dung/số tiền như luồng bank/TronGrid).
export async function POST(req: Request) {
  const secret = await getPaymentConfig("dvnet_webhook_secret");
  if (!secret) {
    return NextResponse.json({ error: "Chưa cấu hình DV.net." }, { status: 503 });
  }

  const rawBody = await req.text();
  const verified = verifyDvnetSignature(rawBody, secret, req.headers.get("x-sign"));
  if (!verified) {
    return NextResponse.json({ error: "Chữ ký không hợp lệ." }, { status: 401 });
  }

  let parsed: DvnetWebhookPayload;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload không phải JSON hợp lệ." }, { status: 400 });
  }

  const { type, txId, amountUsd, storeExternalId } = parseDvnetWebhookPayload(parsed);

  // Chỉ 2 loại event ta thật sự xử lý — còn lại (chưa confirm, rút từ ví xử
  // lý nội bộ DV.net...) ack luôn, không ghi gì, chờ event cuối cùng.
  if (type !== "PaymentReceived" && type !== "PaymentAMLBlocked") {
    return jsonOk();
  }
  if (!storeExternalId) {
    return jsonOk();
  }

  // Idempotency fast-path: DV.net tự thử lại nếu không nhận đúng response —
  // txId đã xử lý (dù cộng được hay không) thì báo thành công ngay.
  if (txId) {
    const existing = await prisma.walletTransaction.findFirst({
      where: { type: "DEPOSIT", method: "dvnet", gatewayRef: txId },
      select: { id: true },
    });
    if (existing) return jsonOk();
  }

  const matched = await prisma.walletTransaction.findFirst({
    where: { type: "DEPOSIT", method: "dvnet", status: "PENDING", depositCode: storeExternalId },
    select: { id: true, userId: true },
  });

  if (type === "PaymentAMLBlocked") {
    if (matched) {
      await prisma.walletTransaction.updateMany({
        where: { id: matched.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          adminNote: "DV.net chặn giao dịch do nghi ngờ AML — không cộng tiền. Liên hệ buyer nếu có khiếu nại.",
        },
      });
    }
    return jsonOk();
  }

  // type === "PaymentReceived" từ đây trở xuống.
  if (!matched) {
    // Không khớp được depositCode nào đang PENDING — về lý thuyết không thể
    // xảy ra (ta luôn tạo dòng WalletTransaction TRƯỚC khi gửi
    // store_external_id này cho DV.net), nhưng WalletTransaction.userId là
    // FK bắt buộc nên KHÔNG có chỗ nào an toàn để ghi 1 bản ghi audit khi
    // không biết user nào — chỉ log server, KHÔNG cộng tiền cho ai, admin
    // cần tự tra log Vercel nếu việc này thực sự xảy ra.
    console.error(
      `[webhook/dvnet] Không khớp được store_external_id=${storeExternalId} (tx_id=${txId ?? "?"}, amount_usd=${amountUsd ?? "?"}) — không có WalletTransaction PENDING nào đang chờ mã này.`
    );
    return jsonOk();
  }

  if (amountUsd === null || amountUsd <= 0) {
    // Có khớp yêu cầu nhưng payload thiếu/sai số tiền — giữ PENDING, ghi chú
    // rõ cho admin, KHÔNG cộng tiền đoán mò. KHÔNG set gatewayRef ở đây — làm
    // vậy sẽ khiến 1 webhook hợp lệ gửi lại sau đó bị nhánh idempotency fast-
    // path phía trên coi nhầm là "đã xử lý" dù chưa hề cộng tiền.
    await prisma.walletTransaction.updateMany({
      where: { id: matched.id, status: "PENDING" },
      data: {
        adminNote: `DV.net báo PaymentReceived (tx_id=${txId ?? "?"}) nhưng payload thiếu/sai amount_usd — cần admin đối chiếu thủ công.`,
      },
    });
    return jsonOk();
  }

  // Số tiền cộng THẬT = amount_usd DV.net xác nhận đã nhận × tỷ giá nạp TẠI
  // THỜI ĐIỂM webhook về (đã áp biên sàn) — KHÔNG dùng số VNĐ ước tính lúc
  // tạo yêu cầu (route deposit-dvnet không khoá tỷ giá, xem comment ở đó).
  let creditedVnd: number;
  try {
    const { rate } = await getUsdtDepositRate();
    creditedVnd = Math.round(amountUsd * rate);
  } catch {
    // Không lấy được tỷ giá — KHÔNG đoán số tiền, để PENDING cho admin xử lý
    // tay thay vì cộng sai. KHÔNG set gatewayRef (xem lý do ở nhánh amountUsd
    // phía trên) — cần webhook retry sau vẫn còn cơ hội tự cộng nếu tỷ giá
    // đã khả dụng trở lại.
    await prisma.walletTransaction.updateMany({
      where: { id: matched.id, status: "PENDING" },
      data: {
        adminNote: `DV.net đã báo nhận ${amountUsd} USD (tx_id=${txId ?? "?"}) nhưng hệ thống không lấy được tỷ giá lúc xử lý — cần admin cộng tay.`,
      },
    });
    return jsonOk();
  }

  try {
    const credited = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id: matched.id, status: "PENDING" },
        data: { status: "CONFIRMED", amount: creditedVnd, gatewayRef: txId, confirmedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: matched.userId },
        data: { walletBalance: { increment: creditedVnd } },
      });
      return true;
    });
    if (!credited) return jsonOk(); // đã xử lý bởi request khác trong lúc chờ
  } catch (err) {
    if (isUniqueViolation(err)) return jsonOk(); // gatewayRef trùng — đã xử lý
    throw err;
  }

  return jsonOk();
}
