import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COMMISSION_SETTING_ID,
  DEFAULT_CAP_PERIOD_DAYS,
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_PER_REFERRER_CAP,
  DEFAULT_PLATFORM_MARGIN_PERCENT,
} from "@/lib/constants";

// Client Prisma bình thường HOẶC client trong 1 transaction ($transaction) —
// mọi helper nhận `db` để dùng được ở cả 2 ngữ cảnh.
type Db = PrismaClient | Prisma.TransactionClient;

// Lấy (hoặc tạo lần đầu) cấu hình hoa hồng singleton. % và margin lưu trong DB
// (không hardcode env) — admin sửa qua Admin > Hoa hồng > Cài đặt.
export async function getCommissionSetting(db: Db = prisma) {
  const existing = await db.commissionSetting.findUnique({ where: { id: COMMISSION_SETTING_ID } });
  if (existing) return existing;
  return db.commissionSetting.create({
    data: {
      id: COMMISSION_SETTING_ID,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      platformMarginPercent: DEFAULT_PLATFORM_MARGIN_PERCENT,
      perReferrerCap: DEFAULT_PER_REFERRER_CAP,
      capPeriodDays: DEFAULT_CAP_PERIOD_DAYS,
    },
  });
}

// Số tiền hoa hồng theo % (percent dạng 5 = 5%).
export function commissionOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

// Ghi nhận hoa hồng PENDING lúc checkout (KHÔNG cộng ví — chỉ tạo bản ghi).
// Điều kiện: buyer có người giới thiệu, KHÔNG tự giới thiệu mình, và đã từng
// nạp tiền thật (>=1 DEPOSIT CONFIRMED). Gắn cờ nếu referrer & referred trùng
// signupIp (không chặn — chỉ để admin review). Chạy TRONG transaction checkout.
export async function accrueCommission(
  tx: Prisma.TransactionClient,
  params: { orderId: string; buyerId: string; referrerId: string; orderTotal: number; feePercent: number }
): Promise<void> {
  const { orderId, buyerId, referrerId, orderTotal, feePercent } = params;
  if (referrerId === buyerId) return;

  const setting = await getCommissionSetting(tx);
  // Kill switch (mục #9B): TẮT thì KHÔNG phát sinh hoa hồng MỚI (không đụng
  // khoản đã kiếm — chúng vẫn ELIGIBLE/PAID/giải ngân được).
  if (!setting.enabled) return;

  const hasDeposit = await tx.walletTransaction.findFirst({
    where: { userId: buyerId, type: "DEPOSIT", status: "CONFIRMED" },
    select: { id: true },
  });
  if (!hasDeposit) return;

  const amount = commissionOf(orderTotal, setting.commissionPercent);
  if (amount <= 0) return;

  const [referrer, referred] = await Promise.all([
    tx.user.findUnique({ where: { id: referrerId }, select: { signupIp: true } }),
    tx.user.findUnique({ where: { id: buyerId }, select: { signupIp: true } }),
  ]);
  const sameIp = Boolean(referrer?.signupIp && referrer.signupIp === referred?.signupIp);

  await tx.referralCommission.create({
    data: {
      orderId,
      referrerId,
      referredUserId: buyerId,
      orderAmount: orderTotal,
      commissionAmount: amount,
      percentApplied: setting.commissionPercent,
      // Lưu % phí sàn HIỆU LỰC của đơn (nguồn cấp hoa hồng) — freeze để tính
      // "phần sàn thực thu ròng" (phí − hoa hồng) không đổi khi admin sửa % sau.
      marginPercentApplied: feePercent,
      status: "PENDING",
      flagged: sameIp,
      flaggedReason: sameIp ? "Referrer và referred trùng IP đăng ký" : null,
    },
  });
}

// Chốt hoa hồng khi ĐƠN đã settle xong (không còn item ESCROW/DISPUTED). Tính
// lại trên phần RELEASED thực tế: nếu có item bị huỷ (hoàn tiền) thì hoa hồng
// giảm theo; nếu không còn gì RELEASED thì huỷ hoa hồng. Đặt trần theo kỳ nếu
// perReferrerCap > 0. Chạy TRONG transaction (escrow release / dispute).
export async function finalizeOrderCommission(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const commission = await tx.referralCommission.findUnique({ where: { orderId } });
  if (!commission || commission.status !== "PENDING") return;

  // Còn item chưa ngã ngũ thì chưa chốt.
  const unsettled = await tx.orderItem.count({
    where: { orderId, status: { in: ["ESCROW", "DISPUTED"] } },
  });
  if (unsettled > 0) return;

  const releasedItems = await tx.orderItem.findMany({
    where: { orderId, status: "RELEASED" },
    select: { price: true, quantity: true, platformFeeAmount: true },
  });
  const releasedTotal = releasedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  // Phí sàn THỰC THU trên phần released (đã freeze ở OrderItem lúc đặt đơn) —
  // đây là nguồn cấp hoa hồng.
  const feeCollected = releasedItems.reduce((s, i) => s + i.platformFeeAmount, 0);

  if (releasedTotal <= 0) {
    await tx.referralCommission.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "CANCELLED", flaggedReason: commission.flaggedReason ?? undefined },
    });
    return;
  }

  // Hoa hồng trên phần released, chốt bằng % đã lock lúc tạo (không hồi tố).
  let amount = commissionOf(releasedTotal, commission.percentApplied);
  // Ràng buộc mục #8: hoa hồng < "phần sàn thực thu ròng" = feeCollected − hoa
  // hồng → 2·hoa hồng < feeCollected. Nếu vượt (vd rounding / lịch phí thấp),
  // cắt về mức lớn nhất còn thoả (giữ net > commission).
  const maxByNet = Math.floor((feeCollected - 1) / 2);
  if (amount > maxByNet) amount = Math.max(0, maxByNet);

  // Trần theo kỳ (nếu bật) — chỉ tính các khoản ELIGIBLE/PAID trong kỳ.
  const setting = await getCommissionSetting(tx);
  let capReason: string | null = null;
  if (setting.perReferrerCap > 0) {
    const since = new Date(Date.now() - setting.capPeriodDays * 24 * 60 * 60 * 1000);
    const agg = await tx.referralCommission.aggregate({
      where: {
        referrerId: commission.referrerId,
        status: { in: ["ELIGIBLE", "PAID"] },
        createdAt: { gte: since },
      },
      _sum: { commissionAmount: true },
    });
    const already = agg._sum.commissionAmount ?? 0;
    const headroom = Math.max(0, setting.perReferrerCap - already);
    if (amount > headroom) {
      capReason = `Vượt trần hoa hồng kỳ (${setting.perReferrerCap.toLocaleString("vi-VN")}đ/${setting.capPeriodDays} ngày) — cắt còn ${headroom.toLocaleString("vi-VN")}đ`;
      amount = headroom;
    }
  }

  if (amount <= 0) {
    await tx.referralCommission.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "CANCELLED", flaggedReason: capReason ?? commission.flaggedReason ?? undefined },
    });
    return;
  }

  await tx.referralCommission.updateMany({
    where: { orderId, status: "PENDING" },
    data: {
      status: "ELIGIBLE",
      orderAmount: releasedTotal,
      commissionAmount: amount,
      eligibleAt: new Date(),
      ...(capReason ? { flagged: true, flaggedReason: capReason } : {}),
    },
  });
}
