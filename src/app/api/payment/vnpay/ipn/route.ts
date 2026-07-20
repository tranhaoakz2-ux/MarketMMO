import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyVnpayReturn } from "@/lib/payment/vnpay";

// IPN (Instant Payment Notification) VNPay — server-to-server, VNPay CHỦ ĐỘNG
// gọi (có retry) sau khi giao dịch hoàn tất. Đây là NGUỒN CHÂN LÝ để cộng ví,
// KHÔNG phải return URL (return chỉ để hiển thị kết quả cho người dùng và có
// thể không bao giờ chạy nếu buyer đóng trình duyệt — bug B4). IPN phải:
//   1. Verify chữ ký HMAC-SHA512 trước khi tin bất kỳ tham số nào.
//   2. Đối chiếu số tiền (vnp_Amount) khớp số đã yêu cầu (tx.amount * 100).
//   3. Cộng ví IDEMPOTENT (gate nguyên tử theo status PENDING) — VNPay gọi lại
//      nhiều lần cũng chỉ cộng đúng 1 lần.
//   4. Trả JSON đúng format VNPay yêu cầu: { RspCode, Message }.
// VNPay dùng phương thức GET cho IPN (query string) — hỗ trợ cả POST cho chắc.

const R = (RspCode: string, Message: string) => NextResponse.json({ RspCode, Message });

async function handle(query: Record<string, string>) {
  // 1. Chữ ký
  if (!verifyVnpayReturn(query)) {
    return R("97", "Invalid signature");
  }

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;
  const tx = await prisma.walletTransaction.findUnique({ where: { id: txnRef } });

  // 2. Không tìm thấy giao dịch
  if (!tx || tx.type !== "DEPOSIT") {
    return R("01", "Order not found");
  }

  // 3. Đối chiếu số tiền
  if (Number(query.vnp_Amount) !== tx.amount * 100) {
    return R("04", "Invalid amount");
  }

  // 4. Đã xử lý rồi (không còn PENDING) — IPN idempotent, trả 02 theo chuẩn
  //    VNPay để cổng ngừng gọi lại, KHÔNG cộng tiền lần nữa.
  if (tx.status !== "PENDING") {
    return R("02", "Order already confirmed");
  }

  if (responseCode === "00") {
    // Gate NGUYÊN TỬ: chỉ request THẮNG (count===1) mới cộng ví.
    const credited = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id: tx.id, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: tx.amount } },
      });
      return true;
    });
    // credited=false nghĩa là 1 IPN/return khác vừa xử lý xong — vẫn trả 00
    // (đã xác nhận thành công), idempotent.
    return R("00", credited ? "Confirm Success" : "Order already confirmed");
  }

  // Giao dịch thất bại phía VNPay — đánh dấu REJECTED (idempotent qua status).
  await prisma.walletTransaction.updateMany({
    where: { id: tx.id, status: "PENDING" },
    data: { status: "REJECTED", adminNote: `VNPay IPN response code: ${responseCode}` },
  });
  return R("00", "Confirm Success");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return handle(query);
}

export async function POST(req: Request) {
  // Một số cấu hình VNPay gửi IPN dạng form-urlencoded qua POST.
  const query: Record<string, string> = {};
  try {
    const form = await req.formData();
    form.forEach((value, key) => {
      query[key] = String(value);
    });
  } catch {
    const url = new URL(req.url);
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
  }
  return handle(query);
}
