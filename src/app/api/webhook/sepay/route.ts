import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentConfig } from "@/lib/payment/config";
import { extractDepositCode, isValidSepayPayload, normalizeForMatch, type SepayWebhookPayload } from "@/lib/payment/sepay";

// Khớp mã đơn trong khoảng thời gian hợp lý — không quét mọi PENDING từ đầu
// thời gian (yêu cầu ngân hàng cũ bị bỏ quên không nên tự nhiên được khớp
// nhầm với 1 giao dịch mới không liên quan).
const MATCH_WINDOW_DAYS = 14;

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function jsonOk() {
  // Hợp đồng response SePay yêu cầu ĐÚNG format này để coi là xử lý thành
  // công (dừng cơ chế thử lại) — xem docs.sepay.vn/tich-hop-webhooks.html.
  return NextResponse.json({ success: true }, { status: 200 });
}

async function verifySignature(rawBody: string, headers: Headers): Promise<boolean> {
  const [secret, apiKey] = await Promise.all([
    getPaymentConfig("sepay_webhook_secret"),
    getPaymentConfig("sepay_api_key"),
  ]);

  const signatureHeader = headers.get("x-sepay-signature");
  const timestampHeader = headers.get("x-sepay-timestamp");
  if (secret && signatureHeader && timestampHeader) {
    // Ký trên RAW BODY BYTES, không parse-rồi-serialize-lại — PHP/JS escape
    // Unicode khác nhau nên serialize lại có thể ra chữ ký sai (xem docs).
    const expected = `sha256=${createHmac("sha256", secret).update(`${timestampHeader}.${rawBody}`).digest("hex")}`;
    if (timingSafeEqualStr(expected, signatureHeader)) return true;
  }

  const authHeader = headers.get("authorization");
  if (apiKey && authHeader) {
    if (timingSafeEqualStr(`Apikey ${apiKey}`, authHeader)) return true;
  }

  return false;
}

export async function POST(req: Request) {
  const [secret, apiKey] = await Promise.all([
    getPaymentConfig("sepay_webhook_secret"),
    getPaymentConfig("sepay_api_key"),
  ]);
  if (!secret && !apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình SePay." }, { status: 503 });
  }

  // Đọc raw text TRƯỚC — bắt buộc cho HMAC (xem verifySignature). Parse
  // JSON CHỈ SAU KHI đã xác thực chữ ký xong.
  const rawBody = await req.text();

  const verified = await verifySignature(rawBody, req.headers);
  if (!verified) {
    return NextResponse.json({ error: "Chữ ký không hợp lệ." }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload không phải JSON hợp lệ." }, { status: 400 });
  }

  if (!isValidSepayPayload(parsed)) {
    return NextResponse.json({ error: "Payload thiếu field bắt buộc." }, { status: 400 });
  }
  const payload: SepayWebhookPayload = parsed;
  const sepayId = String(payload.id);

  // Chỉ xử lý giao dịch TIỀN VÀO — "out" không liên quan tới nạp tiền,
  // không phải lỗi, chỉ đơn giản bỏ qua và báo thành công để SePay không
  // thử lại vô ích.
  if (payload.transferType && payload.transferType !== "in") {
    return jsonOk();
  }

  const realAmount = Math.round(payload.transferAmount!);

  // Idempotency fast-path: đã xử lý (dù khớp được hay không) thì báo thành
  // công ngay, không xử lý lại — quan trọng vì SePay tự thử lại tối đa 7 lần
  // trong 5 giờ nếu không nhận được đúng response mong đợi.
  const [existingConfirmed, existingUnmatched] = await Promise.all([
    prisma.walletTransaction.findFirst({
      where: { type: "DEPOSIT", method: "sepay", gatewayRef: sepayId },
      select: { id: true },
    }),
    prisma.sepayUnmatchedTransaction.findUnique({ where: { sepayId }, select: { id: true } }),
  ]);
  if (existingConfirmed || existingUnmatched) {
    return jsonOk();
  }

  const normalizedIncoming = [payload.content, payload.description, payload.code]
    .map(normalizeForMatch)
    .join(" ");

  const candidates = await prisma.walletTransaction.findMany({
    where: {
      type: "DEPOSIT",
      method: "bank",
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - MATCH_WINDOW_DAYS * 24 * 3600 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true, note: true, expiresAt: true },
  });

  let matchedId: string | null = null;
  let matchedUserId: string | null = null;
  let matchedExpiresAt: Date | null = null;
  for (const c of candidates) {
    const code = extractDepositCode(c.note);
    if (code && normalizedIncoming.includes(normalizeForMatch(code))) {
      matchedId = c.id;
      matchedUserId = c.userId;
      matchedExpiresAt = c.expiresAt;
      break;
    }
  }

  if (matchedId && matchedUserId) {
    // Quá expiresAt (wizard 3 bước ở /nap-tien, xem BANK_DEPOSIT_EXPIRY_MINUTES)
    // mà tiền vẫn về sau đó -> VẪN CỘNG bình thường (an toàn cho khách, tiền
    // thật đã nhận không có lý do gì để giữ lại), chỉ đánh dấu adminNote để
    // admin biết đây là 1 trường hợp khớp trễ hạn, không phải lỗi hệ thống.
    const isLateMatch = matchedExpiresAt !== null && matchedExpiresAt.getTime() < Date.now();
    try {
      const credited = await prisma.$transaction(async (t) => {
        // Gate NGUYÊN TỬ — chỉ khi row còn PENDING mới chuyển được, chặn 2
        // webhook trùng lúc (hoặc SePay thử lại) cùng khớp 1 row cùng lúc.
        const gate = await t.walletTransaction.updateMany({
          where: { id: matchedId!, status: "PENDING" },
          data: {
            status: "CONFIRMED",
            amount: realAmount,
            method: "sepay",
            gatewayRef: sepayId,
            confirmedAt: new Date(),
            ...(isLateMatch
              ? {
                  adminNote: `Khớp SAU KHI hết hạn (expiresAt=${matchedExpiresAt!.toISOString()}) — vẫn cộng tiền bình thường, admin lưu ý đối chiếu.`,
                }
              : {}),
          },
        });
        if (gate.count === 0) return false;
        await t.user.update({
          where: { id: matchedUserId! },
          data: { walletBalance: { increment: realAmount } },
        });
        return true;
      });

      if (credited) return jsonOk();
      // count===0: row đã đổi trạng thái bởi thao tác khác (vd admin duyệt
      // tay đúng lúc webhook tới) trong lúc chờ — KHÔNG suy đoán đã cộng
      // đúng số tiền on-chain thật này chưa, rơi về nhánh "chưa khớp" bên
      // dưới để admin tự đối chiếu, không bỏ sót tiền.
    } catch (err) {
      if (isUniqueViolation(err)) return jsonOk(); // đã có request khác xử lý xong sepayId này
      throw err;
    }
  }

  // Không khớp được (hoặc row khớp vừa bị đổi trạng thái bởi nơi khác) —
  // lưu lại cho admin tự đối chiếu, KHÔNG cộng tiền cho bất kỳ ai.
  try {
    await prisma.sepayUnmatchedTransaction.create({
      data: {
        sepayId,
        gateway: payload.gateway ?? null,
        amount: realAmount,
        content: payload.content ?? payload.description ?? null,
        referenceCode: payload.referenceCode ?? null,
        transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : null,
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  return jsonOk();
}
