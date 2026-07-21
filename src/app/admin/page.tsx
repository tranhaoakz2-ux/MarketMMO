import { auth } from "@/auth";
import { requireAdminPage } from "@/lib/authz";
import {
  getAdminActivityFeed,
  getAdminOverviewStats,
  getAdminSidebarCounts,
  getPlatformRevenueTrend,
} from "@/lib/queries";
import { type RangeKey } from "@/lib/constants";
import AdminOverviewStats from "@/components/AdminOverviewStats";

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

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = (["today", "yesterday", "7d", "month", "last_month", "custom"] as const).includes(
    params.range as RangeKey
  )
    ? (params.range as RangeKey)
    : "7d";
  const { from, to } = resolveRange(range, params.from, params.to);

  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  const session = await auth();

  const [stats, previousStats, revenueTrend, activity, counts] = await Promise.all([
    getAdminOverviewStats(from, to),
    getAdminOverviewStats(prevFrom, prevTo),
    getPlatformRevenueTrend(from, to),
    getAdminActivityFeed(15),
    getAdminSidebarCounts(),
  ]);

  return (
    <AdminOverviewStats
      adminName={session?.user?.name ?? session?.user?.email ?? "Admin"}
      range={range}
      from={params.from}
      to={params.to}
      stats={stats}
      previousGmv={previousStats.gmv}
      revenueTrend={revenueTrend}
      activity={activity}
      counts={counts}
    />
  );
}

export const metadata = { title: "Tổng quan — Admin Control Center — MarketMMO" };
