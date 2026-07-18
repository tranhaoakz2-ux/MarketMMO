import { getAuthSession, getSellerForUser } from "@/lib/authz";
import {
  getSellerAttentionCounts,
  getSellerOrderStatusBreakdown,
  getSellerRecentOrders,
  getSellerRevenueStats,
  getSellerRevenueTrend,
  getSellerStoreSnapshot,
  getSellerTopProducts,
  getSellerWalletSummary,
} from "@/lib/queries";
import { type RangeKey } from "@/lib/constants";
import SellerOverviewStats from "@/components/SellerOverviewStats";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function resolveRange(
  range: RangeKey,
  fromParam?: string,
  toParam?: string
): { from: Date; to: Date } {
  const now = new Date();
  switch (range) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "month": {
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    case "custom": {
      const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? new Date(fromParam) : now;
      const to = toParam && !Number.isNaN(Date.parse(toParam)) ? new Date(toParam) : now;
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export default async function SellerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = (["today", "yesterday", "7d", "month", "last_month", "custom"] as const).includes(
    params.range as RangeKey
  )
    ? (params.range as RangeKey)
    : "today";
  const { from, to } = resolveRange(range, params.from, params.to);

  // Kỳ trước liền kề, CÙNG độ dài với khoảng đang chọn — dùng để tính % tăng/
  // giảm doanh thu hiển thị trên thẻ KPI (vd chọn "7 ngày" thì so với 7 ngày
  // liền trước đó).
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);

  const [
    revenueStats,
    previousRevenueStats,
    walletSummary,
    revenueTrend,
    orderStatusBreakdown,
    topProducts,
    recentOrders,
    attentionCounts,
    storeSnapshot,
  ] = await Promise.all([
    getSellerRevenueStats(seller!.id, from, to),
    getSellerRevenueStats(seller!.id, prevFrom, prevTo),
    getSellerWalletSummary(session!.user!.id, seller!.id),
    getSellerRevenueTrend(seller!.id, from, to),
    getSellerOrderStatusBreakdown(seller!.id, from, to),
    getSellerTopProducts(seller!.id, from, to),
    getSellerRecentOrders(seller!.id),
    getSellerAttentionCounts(seller!.id),
    getSellerStoreSnapshot(seller!.id),
  ]);

  return (
    <SellerOverviewStats
      range={range}
      from={params.from}
      to={params.to}
      revenueStats={revenueStats}
      previousRevenue={previousRevenueStats.releasedRevenue}
      walletSummary={walletSummary}
      revenueTrend={revenueTrend}
      orderStatusBreakdown={orderStatusBreakdown}
      topProducts={topProducts}
      recentOrders={recentOrders}
      attentionCounts={attentionCounts}
      storeSnapshot={storeSnapshot}
    />
  );
}

export const metadata = { title: "Tổng quan — Quản Lý Bán Hàng — MarketMMO" };
