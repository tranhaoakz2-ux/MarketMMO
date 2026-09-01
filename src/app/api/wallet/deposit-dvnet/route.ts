import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  DVNET_DEPOSIT_CODE_MAX_RETRIES,
  DVNET_DEPOSIT_EXPIRY_MINUTES,
  MAX_USDT_DEPOSIT_VND,
  MIN_USDT_DEPOSIT_VND,
} from "@/lib/constants";
import { getUsdtDepositRate } from "@/lib/payment/exchange-rate";
import { createDvnetDeposit, findUsdtTrc20CurrencyCode, getDvnetConfig, getUsdtProvider } from "@/lib/payment/dvnet";
import { rateLimit } from "@/lib/rate-limit";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Mã dùng làm "store_external_id" gửi cho DV.net — DV.net echo LẠI nguyên
// văn trong webhook (wallet.store_external_id), đây là cách duy nhất khớp
// webhook về đúng WalletTransaction, KHÔNG dựa vào khớp số tiền/nội dung tự
// do như luồng bank/TronGrid. Lưu vào cột depositCode có sẵn (UNIQUE), không
// cần thêm cột mới.
function randomDvnetCode(): string {
  return `DVNET${randomBytes(12).toString("hex").toUpperCase()}`;
}

// Buyer "đặt yêu cầu" nạp USDT qua DV.net — gọi API DV.net tạo 1 ví/link
// thanh toán RIÊNG cho lượt nạp này (khác luồng TronGrid dùng chung 1 địa
// chỉ tĩnh), trả về pay_url để buyer thanh toán trên trang DV.net. Webhook
// (POST /api/webhook/dvnet) tự cộng tiền khi DV.net báo nhận được — xem
// route đó để biết số tiền THỰC cộng có thể khác số VNĐ ước tính ở đây (tính
// lại theo amount_usd + tỷ giá TẠI LÚC webhook về, không khoá tỷ giá ở bước
// này để tránh phải thêm cột lưu tỷ giá đã khoá).
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const limited = rateLimit(`dvnet-deposit:${userId}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const provider = await getUsdtProvider();
  if (provider !== "dvnet") {
    return NextResponse.json({ error: "Cổng nạp DV.net chưa được bật." }, { status: 503 });
  }

  const dvnetConfig = await getDvnetConfig();
  if (!dvnetConfig) {
    return NextResponse.json({ error: "DV.net chưa được cấu hình đầy đủ." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const vndAmount = Number(body?.vndAmount);
  if (
    !Number.isInteger(vndAmount) ||
    vndAmount < MIN_USDT_DEPOSIT_VND ||
    vndAmount > MAX_USDT_DEPOSIT_VND
  ) {
    return NextResponse.json(
      {
        error: `Số tiền phải là số nguyên, từ ${MIN_USDT_DEPOSIT_VND.toLocaleString("vi-VN")}đ đến ${MAX_USDT_DEPOSIT_VND.toLocaleString("vi-VN")}đ.`,
      },
      { status: 400 }
    );
  }

  let rate: number;
  try {
    ({ rate } = await getUsdtDepositRate());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không lấy được tỷ giá USDT/VNĐ lúc này.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Ước tính USDT cần chuyển — CHỈ để hiển thị/truyền cho DV.net lúc tạo ví,
  // KHÔNG phải số tiền cuối cùng được cộng (webhook tính lại theo amount_usd
  // thật DV.net báo về + tỷ giá tại thời điểm đó).
  const usdtAmount = Math.max(0.01, Math.round((vndAmount / rate) * 100) / 100);

  let currencyCode: string;
  try {
    currencyCode = await findUsdtTrc20CurrencyCode(dvnetConfig);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không lấy được danh sách currency từ DV.net.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const expiresAt = new Date(Date.now() + DVNET_DEPOSIT_EXPIRY_MINUTES * 60_000);

  for (let attempt = 0; attempt < DVNET_DEPOSIT_CODE_MAX_RETRIES; attempt++) {
    const depositCode = randomDvnetCode();
    const baseNote = `Yêu cầu nạp qua DV.net — ước tính ${usdtAmount} USDT theo tỷ giá lúc tạo yêu cầu ${rate.toLocaleString("vi-VN")}đ/USDT (số cộng thật tính lại lúc DV.net báo nhận tiền).`;

    let walletTxId: string | null = null;
    try {
      const tx = await prisma.walletTransaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          amount: vndAmount,
          status: "PENDING",
          method: "dvnet",
          note: baseNote,
          depositCode,
          expiresAt,
        },
      });
      walletTxId = tx.id;
    } catch (err) {
      // P2002 trên depositCode (unique) -> cực hiếm, thử lại với mã khác.
      if (isUniqueViolation(err)) continue;
      throw err;
    }

    try {
      const { payUrl, walletAddress } = await createDvnetDeposit({
        config: dvnetConfig,
        amount: usdtAmount,
        currency: currencyCode,
        storeExternalId: depositCode,
      });
      // Ghi thêm dòng "pay_url: ..." vào note (xem regex đọc lại ở GET bên
      // dưới) — CHỈ để khôi phục UI khi buyer refresh trang giữa chừng,
      // không phải nguồn dữ liệu nghiệp vụ nào khác đọc lại. depositAddress
      // lưu cột riêng (đã thêm ở migration trước) — null nếu DV.net không
      // trả address, không chặn gì.
      await prisma.walletTransaction.update({
        where: { id: walletTxId },
        data: { note: `${baseNote}\npay_url: ${payUrl}`, depositAddress: walletAddress },
      });
      return NextResponse.json({
        id: walletTxId,
        vndAmount,
        usdtAmount,
        payUrl,
        depositAddress: walletAddress,
        expiresAt,
      });
    } catch (err) {
      // Gọi DV.net thất bại — chưa có gì thật phát sinh phía DV.net, xoá
      // luôn bản ghi vừa tạo thay vì để lại 1 dòng PENDING chết không ai xử
      // lý được (không có pay_url, buyer không thể thanh toán).
      await prisma.walletTransaction.delete({ where: { id: walletTxId } }).catch(() => {});
      const message = err instanceof Error ? err.message : "Không thể tạo yêu cầu nạp qua DV.net.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Hệ thống đang bận, vui lòng thử lại." }, { status: 503 });
}

const PAY_URL_LINE = /^pay_url: (\S+)$/m;
// Số USDT ước tính đã được viết sẵn vào baseNote lúc tạo lệnh (POST bên
// trên: "... ước tính 12.34 USDT theo tỷ giá ...") — KHÔNG có cột riêng lưu
// số này cho lệnh nạp (cột usdtAmount trên WalletTransaction chỉ dành cho
// type="WITHDRAW", xem schema.prisma), nên đọc lại bằng regex thay vì thêm
// cột mới. Nếu đổi câu chữ baseNote ở POST, PHẢI sửa regex này theo.
const USDT_AMOUNT_LINE = /ước tính ([\d.]+) USDT/;

// Trả yêu cầu PENDING gần nhất còn hiệu lực của user hiện tại (nếu có) — để
// buyer refresh trang giữa chừng không mất địa chỉ/QR/countdown đã tạo (đọc
// lại từ cột depositAddress + các dòng "pay_url: ..."/"ước tính ... USDT"
// trong note, xem POST bên trên).
export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const tx = await prisma.walletTransaction.findFirst({
    where: { userId, type: "DEPOSIT", method: "dvnet", status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, expiresAt: true, note: true, status: true, depositAddress: true },
  });
  if (!tx) return NextResponse.json({ intent: null });

  const payUrl = tx.note?.match(PAY_URL_LINE)?.[1] ?? null;
  if (!payUrl) return NextResponse.json({ intent: null });
  const usdtAmountMatch = tx.note?.match(USDT_AMOUNT_LINE)?.[1];
  const usdtAmount = usdtAmountMatch ? Number(usdtAmountMatch) : null;

  return NextResponse.json({
    intent: {
      id: tx.id,
      vndAmount: tx.amount,
      usdtAmount,
      payUrl,
      depositAddress: tx.depositAddress,
      expiresAt: tx.expiresAt,
      status: tx.status,
    },
  });
}
