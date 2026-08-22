import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import {
  MAX_USDT_DEPOSIT_VND,
  MIN_USDT_DEPOSIT_VND,
  USDT_DEPOSIT_INTENT_EXPIRY_MINUTES,
  USDT_DEPOSIT_INTENT_MAX_COLLISION_RETRIES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getUsdtInfo } from "@/lib/payment/deposit";
import { getUsdtDepositRate } from "@/lib/payment/exchange-rate";
import { rateLimit } from "@/lib/rate-limit";

const USDT_DECIMALS_FACTOR = BigInt(1_000_000);

// 6 số thập phân cuối làm mã định danh ngẫu nhiên (0.000001–0.999999 USDT) —
// đây là "mã ghi nhớ" thay thế cho memo/tag (USDT-TRC20 không hỗ trợ), xem
// comment đầy đủ ở model UsdtDepositIntent trong schema.prisma.
function randomOffsetRaw(): bigint {
  return BigInt(1 + Math.floor(Math.random() * 999_999));
}

function formatUsdtRaw(raw: bigint): string {
  const s = raw.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6)}`;
}

// Buyer "đặt trước" 1 yêu cầu nạp USDT — nhận về số USDT ĐỊNH DANH RIÊNG
// phải chuyển. Đây là bước BẮT BUỘC trước khi POST /api/wallet/deposit-usdt
// (xác nhận TxID) có thể tự động cộng tiền — xem route đó để biết cơ chế
// khớp đầy đủ.
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const limited = rateLimit(`usdt-deposit-intent:${userId}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const usdtInfo = await getUsdtInfo();
  if (!usdtInfo) {
    return NextResponse.json({ error: "Nạp tiền bằng USDT chưa được bật." }, { status: 503 });
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

  // Tỷ giá NẠP đã áp biên sàn (spread) — CÙNG hàm với chỗ hiển thị ước tính
  // trên /nap-tien (src/app/nap-tien/page.tsx), không tách nguồn riêng để
  // tránh lệch số như tỷ giá hiển thị/tính tiền trước đây.
  let rate: number;
  let source: "coingecko" | "fallback";
  try {
    ({ rate, baseSource: source } = await getUsdtDepositRate());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không lấy được tỷ giá USDT/VNĐ lúc này.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Dọn lười các yêu cầu PENDING cũ của CHÍNH user này đã quá hạn — tránh để
  // 1 user tích luỹ nhiều "mã định danh" chiếm chỗ vô ích (không ảnh hưởng
  // bảo mật, chỉ dọn dữ liệu).
  await prisma.usdtDepositIntent.updateMany({
    where: { userId, status: "PENDING", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });

  const baseWholeUsdt = Math.max(1, Math.round(vndAmount / rate));
  const baseRaw = BigInt(baseWholeUsdt) * USDT_DECIMALS_FACTOR;
  const expiresAt = new Date(Date.now() + USDT_DEPOSIT_INTENT_EXPIRY_MINUTES * 60_000);

  let usdtAmountRaw: bigint | null = null;
  for (let attempt = 0; attempt < USDT_DEPOSIT_INTENT_MAX_COLLISION_RETRIES; attempt++) {
    const candidate = baseRaw + randomOffsetRaw();
    const collision = await prisma.usdtDepositIntent.findFirst({
      where: { usdtAmountRaw: candidate, status: "PENDING", expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!collision) {
      usdtAmountRaw = candidate;
      break;
    }
  }
  if (usdtAmountRaw === null) {
    return NextResponse.json(
      { error: "Hệ thống đang bận, vui lòng thử lại sau ít phút." },
      { status: 503 }
    );
  }

  const intent = await prisma.usdtDepositIntent.create({
    data: { userId, vndAmount, usdtAmountRaw, rate, rateSource: source, expiresAt },
  });

  return NextResponse.json({
    id: intent.id,
    vndAmount: intent.vndAmount,
    usdtAmount: formatUsdtRaw(intent.usdtAmountRaw),
    address: usdtInfo.address,
    expiresAt: intent.expiresAt,
  });
}

// Trả yêu cầu PENDING gần nhất còn hiệu lực của user hiện tại (nếu có) — để
// buyer refresh trang giữa chừng không mất thông tin số USDT/địa chỉ đã cấp.
export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  await prisma.usdtDepositIntent.updateMany({
    where: { userId, status: "PENDING", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });

  const intent = await prisma.usdtDepositIntent.findFirst({
    where: { userId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!intent) return NextResponse.json({ intent: null });

  const usdtInfo = await getUsdtInfo();
  return NextResponse.json({
    intent: {
      id: intent.id,
      vndAmount: intent.vndAmount,
      usdtAmount: formatUsdtRaw(intent.usdtAmountRaw),
      address: usdtInfo?.address ?? null,
      expiresAt: intent.expiresAt,
    },
  });
}
