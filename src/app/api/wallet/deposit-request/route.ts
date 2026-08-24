import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { BANK_DEPOSIT_EXPIRY_MINUTES, MAX_BANK_DEPOSIT_VND, MIN_BANK_DEPOSIT_VND } from "@/lib/constants";

const DEPOSIT_CODE_MAX_RETRIES = 5;

// "NAP" + 6 ký tự cuối userId + 8 hex ngẫu nhiên — khớp đúng
// DEPOSIT_CODE_REGEX (/NAP[A-Z0-9]{6,}/) mà webhook SePay đang dùng để
// trích mã từ nội dung chuyển khoản (xem src/lib/payment/sepay.ts), KHÔNG
// đổi định dạng cũ để không phải sửa webhook đang chạy.
function randomDepositCode(userId: string): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `NAP${userId.slice(-6).toUpperCase()}${suffix}`;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const method = typeof body?.method === "string" ? body.method : "bank";

  if (method === "bank") {
    // NGÂN HÀNG (VietQR, wizard 3 bước — xem DepositPanel.tsx) — số tiền
    // ĐÃ validate, mã nội dung CK + hạn dùng sinh Ở SERVER. KHÔNG tin
    // amount/code/note từ client (khác nhánh cũ bên dưới, nơi client tự
    // dựng "note" rồi gửi thẳng lên — nhánh đó giữ nguyên cho method khác).
    if (!Number.isFinite(amount) || amount < MIN_BANK_DEPOSIT_VND || amount > MAX_BANK_DEPOSIT_VND) {
      return NextResponse.json(
        {
          error: `Số tiền nạp phải từ ${MIN_BANK_DEPOSIT_VND.toLocaleString("vi-VN")}đ đến ${MAX_BANK_DEPOSIT_VND.toLocaleString("vi-VN")}đ.`,
        },
        { status: 400 }
      );
    }
    const wholeAmount = Math.round(amount);
    const expiresAt = new Date(Date.now() + BANK_DEPOSIT_EXPIRY_MINUTES * 60_000);

    for (let attempt = 0; attempt < DEPOSIT_CODE_MAX_RETRIES; attempt++) {
      const code = randomDepositCode(session!.user.id);
      try {
        const tx = await prisma.walletTransaction.create({
          data: {
            userId: session!.user.id,
            type: "DEPOSIT",
            amount: wholeAmount,
            status: "PENDING",
            method: "bank",
            note: `Nội dung CK: ${code}`,
            depositCode: code,
            expiresAt,
          },
        });
        return NextResponse.json({
          id: tx.id,
          code,
          amount: wholeAmount,
          expiresAt: tx.expiresAt,
        });
      } catch (err) {
        // P2002 trên depositCode (unique) -> cực hiếm (8 hex ~4 tỷ khả
        // năng), thử lại với mã khác thay vì lỗi thẳng cho buyer.
        if (isUniqueViolation(err)) continue;
        throw err;
      }
    }
    return NextResponse.json(
      { error: "Hệ thống đang bận, vui lòng thử lại." },
      { status: 503 }
    );
  }

  // Nhánh CŨ — giữ nguyên hành vi cho các method khác ("usdt" thủ công cũ,
  // không phải luồng TronGrid tự động ở /api/wallet/deposit-usdt đang dùng
  // thật; vnpay không đi qua route này). KHÔNG đổi gì ở đây.
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
