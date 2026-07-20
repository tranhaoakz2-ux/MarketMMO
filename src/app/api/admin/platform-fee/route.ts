import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getPlatformFeeSetting } from "@/lib/platform-fee";
import { PLATFORM_FEE_SETTING_ID } from "@/lib/constants";

// GET: cấu hình % mặc định + lịch phí + lịch sử đổi % + dashboard tổng phí thu
// (theo kỳ, theo seller). Phí "thu được" = phí đã freeze trên OrderItem của
// item ĐÃ RELEASED (lúc đó phí thực sự được giữ lại).
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from && !Number.isNaN(Date.parse(from))) createdAt.gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) createdAt.lte = new Date(`${to}T23:59:59.999`);
  const dateWhere = from || to ? { createdAt } : {};

  const [setting, schedules, history, totalAgg, bySeller] = await Promise.all([
    getPlatformFeeSetting(),
    prisma.platformFeeSchedule.findMany({
      orderBy: { startAt: "desc" },
      include: { createdBy: { select: { name: true, username: true, email: true } } },
    }),
    prisma.platformFeeChange.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { changedBy: { select: { name: true, username: true, email: true } } },
    }),
    prisma.orderItem.aggregate({
      where: { status: "RELEASED", ...dateWhere },
      _sum: { platformFeeAmount: true },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["sellerId"],
      where: { status: "RELEASED", ...dateWhere },
      _sum: { platformFeeAmount: true },
      orderBy: { _sum: { platformFeeAmount: "desc" } },
      take: 20,
    }),
  ]);

  // map sellerId → shopName
  const sellerIds = bySeller.map((s) => s.sellerId);
  const sellers = sellerIds.length
    ? await prisma.seller.findMany({ where: { id: { in: sellerIds } }, select: { id: true, shopName: true, slug: true } })
    : [];
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  return NextResponse.json({
    setting: { defaultFeePercent: setting.defaultFeePercent, updatedAt: setting.updatedAt },
    schedules: schedules.map((s) => ({
      id: s.id,
      feePercent: s.feePercent,
      startAt: s.startAt,
      endAt: s.endAt,
      by: s.createdBy.name ?? s.createdBy.username ?? s.createdBy.email ?? "admin",
      createdAt: s.createdAt,
    })),
    history: history.map((h) => ({
      id: h.id,
      by: h.changedBy.name ?? h.changedBy.username ?? h.changedBy.email ?? "admin",
      oldPercent: h.oldPercent,
      newPercent: h.newPercent,
      createdAt: h.createdAt,
    })),
    dashboard: {
      totalFee: totalAgg._sum.platformFeeAmount ?? 0,
      releasedItems: totalAgg._count._all,
      bySeller: bySeller.map((s) => ({
        sellerId: s.sellerId,
        shopName: sellerMap.get(s.sellerId)?.shopName ?? "—",
        slug: sellerMap.get(s.sellerId)?.slug ?? null,
        totalFee: s._sum.platformFeeAmount ?? 0,
      })),
    },
  });
}

// PATCH: đổi % phí sàn MẶC ĐỊNH (không hồi tố — đơn cũ freeze snapshot). Ghi
// lịch sử + audit. Ràng buộc: % mặc định phải > 2× % hoa hồng hiện tại (giữ
// invariant mục #8).
export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const defaultFeePercent = Number(body?.defaultFeePercent);
  if (!Number.isFinite(defaultFeePercent) || defaultFeePercent < 0 || defaultFeePercent > 100) {
    return NextResponse.json({ error: "% phí sàn không hợp lệ (0–100)." }, { status: 400 });
  }

  const commission = await prisma.commissionSetting.findUnique({ where: { id: "singleton" } });
  const commissionPercent = commission?.commissionPercent ?? 0;
  if (commissionPercent * 2 >= defaultFeePercent) {
    return NextResponse.json(
      {
        error: `Không thể lưu: phí sàn (${defaultFeePercent}%) phải LỚN HƠN 2× % hoa hồng hiện tại (${commissionPercent}% → cần > ${commissionPercent * 2}%) để giữ ràng buộc hoa hồng < phần sàn thực thu ròng. Giảm % hoa hồng trước hoặc tăng phí.`,
      },
      { status: 400 }
    );
  }

  const current = await getPlatformFeeSetting();
  await prisma.$transaction(async (t) => {
    await t.platformFeeSetting.update({
      where: { id: PLATFORM_FEE_SETTING_ID },
      data: { defaultFeePercent, updatedById: session!.user!.id },
    });
    if (current.defaultFeePercent !== defaultFeePercent) {
      await t.platformFeeChange.create({
        data: { changedById: session!.user!.id, oldPercent: current.defaultFeePercent, newPercent: defaultFeePercent },
      });
    }
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đổi % phí sàn mặc định",
    targetType: "PlatformFeeSetting",
    detail: `${current.defaultFeePercent}% → ${defaultFeePercent}%`,
  });

  return NextResponse.json({ ok: true });
}
