import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLATFORM_FEE_PERCENT, PLATFORM_FEE_SETTING_ID } from "@/lib/constants";

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
