import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLATFORM_FEE_PERCENT, PLATFORM_FEE_SETTING_ID } from "@/lib/constants";
import { getSellerLevelConfigs } from "@/lib/seller-level";

type Db = PrismaClient | Prisma.TransactionClient;

// Cấu hình phí sàn singleton (% mặc định). Tạo lần đầu nếu chưa có.
export async function getPlatformFeeSetting(db: Db = prisma) {
  const existing = await db.platformFeeSetting.findUnique({ where: { id: PLATFORM_FEE_SETTING_ID } });
  if (existing) return existing;
  return db.platformFeeSetting.create({
    data: { id: PLATFORM_FEE_SETTING_ID, defaultFeePercent: DEFAULT_PLATFORM_FEE_PERCENT },
  });
}

// % phí sàn HIỆU LỰC tại 1 thời điểm: nếu có mốc lịch phí (PlatformFeeSchedule)
// bao thời điểm đó thì dùng %, else dùng % mặc định. Các mốc KHÔNG chồng lấn
// (đảm bảo ở tầng tạo/sửa) nên tối đa 1 mốc khớp.
export async function getEffectiveFeePercent(db: Db = prisma, at: Date = new Date()): Promise<number> {
  const period = await db.platformFeeSchedule.findFirst({
    where: { startAt: { lte: at }, endAt: { gte: at } },
    orderBy: { startAt: "desc" },
  });
  if (period) return period.feePercent;
  const setting = await getPlatformFeeSetting(db);
  return setting.defaultFeePercent;
}

// Số tiền phí sàn = round(base × pct/100). base = giá SAU giảm giá của dòng hàng.
export function feeAmountOf(base: number, percent: number): number {
  return Math.round((base * percent) / 100);
}

// % phí sàn hiệu lực CHO TỪNG SELLER = basePercent (getEffectiveFeePercent ở
// trên) TRỪ SellerLevelConfig[level].feeDiscountPercent của đúng seller đó —
// LUÔN chặn sàn ở 0 (không bao giờ âm, kể cả nếu admin lỡ đặt % giảm lớn
// hơn phí gốc). Mặc định feeDiscountPercent=0 mọi hạng -> map trả về ĐÚNG
// basePercent cho mọi seller, hành vi giống hệt trước khi có hạng người bán
// (chỉ có tác dụng khi admin tự đặt % giảm khác 0 cho 1 hạng cụ thể). Dùng
// 1 lần cho nhiều seller trong cùng 1 đơn (POST /api/checkout) — tránh N+1
// bằng cách nhận sẵn map level của các seller liên quan.
export async function getEffectiveFeePercentPerSeller(
  db: Db,
  basePercent: number,
  sellers: { id: string; level: number }[]
): Promise<Map<string, number>> {
  const configs = await getSellerLevelConfigs(db);
  const discountByLevel = new Map(configs.map((c) => [c.level, c.feeDiscountPercent]));
  const result = new Map<string, number>();
  for (const s of sellers) {
    const discount = discountByLevel.get(s.level) ?? 0;
    result.set(s.id, Math.max(0, basePercent - discount));
  }
  return result;
}
