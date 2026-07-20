import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CommissionStatus } from "@/lib/constants";

// Danh sách hoa hồng cho Admin > Hoa hồng — lọc theo status / người giới thiệu
// / khoảng ngày, kèm tổng tiền từng nhóm trạng thái + số bản ghi bị gắn cờ.
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status"); // ALL | FLAGGED | <CommissionStatus>
  const referrerId = searchParams.get("referrerId")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.ReferralCommissionWhereInput = {};
  if (referrerId) where.referrerId = referrerId;
  if (from || to) {
    where.createdAt = {};
    if (from && !Number.isNaN(Date.parse(from))) where.createdAt.gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }
  if (statusParam === "FLAGGED") where.flagged = true;
  else if (statusParam && statusParam !== "ALL") where.status = statusParam;

  const [rows, byStatus, flaggedAgg] = await Promise.all([
    prisma.referralCommission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        referrer: { select: { id: true, name: true, username: true, email: true } },
        referredUser: { select: { name: true, username: true, email: true } },
      },
    }),
    prisma.referralCommission.groupBy({
      by: ["status"],
      _sum: { commissionAmount: true },
      _count: { _all: true },
    }),
    prisma.referralCommission.aggregate({
      where: { flagged: true },
      _sum: { commissionAmount: true },
      _count: { _all: true },
    }),
  ]);

  const summary: Record<string, { count: number; total: number }> = {
    PENDING: { count: 0, total: 0 },
    ELIGIBLE: { count: 0, total: 0 },
    PAID: { count: 0, total: 0 },
    CANCELLED: { count: 0, total: 0 },
    FLAGGED: { count: flaggedAgg._count._all, total: flaggedAgg._sum.commissionAmount ?? 0 },
  };
  for (const g of byStatus) {
    summary[g.status as CommissionStatus] = {
      count: g._count._all,
      total: g._sum.commissionAmount ?? 0,
    };
  }

  return NextResponse.json({
    summary,
    commissions: rows.map((r) => ({
      id: r.id,
      status: r.status,
      commissionAmount: r.commissionAmount,
      orderAmount: r.orderAmount,
      percentApplied: r.percentApplied,
      flagged: r.flagged,
      flaggedReason: r.flaggedReason,
      eligibleAt: r.eligibleAt,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
      orderId: r.orderId,
      referrer: r.referrer,
      referredName: r.referredUser.name ?? r.referredUser.username ?? r.referredUser.email ?? "—",
    })),
  });
}
