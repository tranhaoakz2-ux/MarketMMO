import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  Info,
  Lock,
  Package,
  PackageX,
  PiggyBank,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import SellerOverviewChart from "@/components/SellerOverviewChart";
import { formatRelativeTime, formatVnd } from "@/lib/format";
import {
  INSURANCE_FUND_TARGET,
  orderStatusLabel,
  type OrderStatus,
  type RangeKey,
} from "@/lib/constants";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
];

const statusDotClass: Record<OrderStatus, string> = {
  ESCROW: "bg-brand-dark",
  RELEASED: "bg-success",
  CANCELLED: "bg-muted",
  DISPUTED: "bg-danger",
};

function toInputDate(d?: string) {
  if (!d) return "";
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

type TopProduct = {
  productName: string;
  slug: string;
  categoryName: string;
  quantity: number;
  revenue: number;
};

type RecentOrder = {
  id: string;
  productName: string;
  buyerName: string;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
};

// ---- Sparkline (SVG thuần, không hook) — dùng trong thẻ KPI Doanh thu --------
function Sparkline({ points }: { points: number[] }) {
  const W = 120;
  const H = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / Math.max(points.length - 1, 1)) * W;
  const y = (v: number) => H - 3 - ((v - min) / span) * (H - 6);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={area} className="fill-brand/20" />
      <path d={line} fill="none" className="stroke-brand-dark" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  icon: Icon,
  iconWrap,
  label,
  value,
  accent = false,
  delta,
  sub,
  linkHref,
  linkLabel,
  spark,
}: {
  icon: typeof PiggyBank;
  iconWrap: string;
  label: string;
  value: string;
  accent?: boolean;
  delta?: number | null;
  sub?: string;
  linkHref?: string;
  linkLabel?: string;
  spark?: number[];
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-brand-dark/30" : "border-border-c"
      }`}
    >
      {accent && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-dark to-brand" />}
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta !== undefined && delta !== null && (
          <span
            className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-4 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 break-words text-[26px] font-black leading-tight tabular-nums text-foreground">{value}</p>
      {spark && spark.length > 1 && (
        <div className="mt-2">
          <Sparkline points={spark} />
        </div>
      )}
      {sub && !linkHref && <p className="mt-2 text-[11px] text-muted">{sub}</p>}
      {linkHref && (
        <Link href={linkHref} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-dark transition hover:gap-1.5">
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border-c bg-surface p-5 shadow-sm ${className}`}>{children}</div>;
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-black text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

function EmptyState({ icon: Icon, children }: { icon: typeof PackageX; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <p className="max-w-[240px] text-xs text-muted">{children}</p>
    </div>
  );
}

export default function SellerOverviewStats({
  range,
  from,
  to,
  revenueStats,
  previousRevenue,
  walletSummary,
  revenueTrend,
  orderStatusBreakdown,
  topProducts,
  recentOrders,
  attentionCounts,
  storeSnapshot,
}: {
  range: RangeKey;
  from?: string;
  to?: string;
  revenueStats: { releasedRevenue: number; escrowHeld: number; orderCount: number };
  previousRevenue: number;
  walletSummary: { walletBalance: number; insuranceBalance: number };
  revenueTrend: { label: string; value: number }[];
  orderStatusBreakdown: Record<OrderStatus, number>;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  attentionCounts: { pendingProducts: number; openDisputes: number; lowStock: number };
  storeSnapshot: {
    shopName: string;
    slug: string;
    level: number;
    verified: boolean;
    insuranceBalance: number;
    avgRating: number;
    reviewCount: number;
  } | null;
}) {
  const deltaPct = previousRevenue > 0 ? Math.round(((revenueStats.releasedRevenue - previousRevenue) / previousRevenue) * 100) : null;
  const insurancePct = Math.min(100, Math.round((walletSummary.insuranceBalance / INSURANCE_FUND_TARGET) * 100));
  const statusEntries = (["RELEASED", "ESCROW", "DISPUTED", "CANCELLED"] as const).map((k) => ({
    key: k,
    count: orderStatusBreakdown[k],
  }));
  const statusTotal = statusEntries.reduce((s, e) => s + e.count, 0);
  const hasRevenue = revenueTrend.some((b) => b.value > 0);
  const sparkPoints = hasRevenue ? revenueTrend.map((t) => t.value) : undefined;
  const shopHref = storeSnapshot ? `/shop/${storeSnapshot.slug}` : "#";

  const attentionItems = [
    { href: "/trang-ban-hang/san-pham", icon: Package, wrap: "bg-brand-light text-brand-dark", title: "Sản phẩm chờ duyệt", sub: "Admin chưa duyệt xong", count: attentionCounts.pendingProducts },
    { href: "/trang-ban-hang/khieu-nai", icon: AlertTriangle, wrap: "bg-danger/10 text-danger", title: "Khiếu nại đang mở", sub: "Cần bạn phản hồi buyer", count: attentionCounts.openDisputes },
    { href: "/trang-ban-hang/san-pham", icon: TrendingDown, wrap: "bg-info/10 text-info", title: "Sắp hết hàng", sub: "Kho thật còn dưới 3 đơn vị", count: attentionCounts.lowStock },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Quản lý bán hàng</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">Tổng quan</h1>
          <p className="mt-1 text-sm text-muted">Theo dõi dòng tiền, đơn hàng và việc cần xử lý cho gian hàng của bạn.</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-border-c bg-surface-alt p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/trang-ban-hang?range=${r.key}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  range === r.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <form action="/trang-ban-hang" method="get" className="flex flex-wrap items-center gap-1.5">
            <input type="hidden" name="range" value="custom" />
            <input
              type="date"
              name="from"
              defaultValue={toInputDate(from)}
              className="rounded-lg border border-border-c bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-brand-dark focus:outline-none"
            />
            <span className="text-xs text-muted">—</span>
            <input
              type="date"
              name="to"
              defaultValue={toInputDate(to)}
              className="rounded-lg border border-border-c bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-brand-dark focus:outline-none"
            />
            <button
              type="submit"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                range === "custom" ? "bg-brand text-ink" : "bg-surface-alt text-foreground hover:bg-border-c"
              }`}
            >
              Lọc
            </button>
          </form>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={PiggyBank}
          iconWrap="bg-brand text-ink"
          label={`Doanh thu · ${revenueStats.orderCount} đơn`}
          value={formatVnd(revenueStats.releasedRevenue)}
          accent
          delta={deltaPct}
          spark={sparkPoints}
        />
        <KpiCard icon={Lock} iconWrap="bg-brand-light text-brand-dark" label="Tiền tạm giữ (ký quỹ)" value={formatVnd(revenueStats.escrowHeld)} sub="Sẽ giải ngân sau thời gian ký quỹ" />
        <KpiCard icon={Wallet} iconWrap="bg-success/10 text-success" label="Số dư ví" value={formatVnd(walletSummary.walletBalance)} linkHref="/trang-ban-hang/rut-tien" linkLabel="Rút tiền" />
        <KpiCard
          icon={ShieldCheck}
          iconWrap="bg-info/10 text-info"
          label="Quỹ bảo hiểm"
          value={formatVnd(walletSummary.insuranceBalance)}
          sub={
            walletSummary.insuranceBalance >= INSURANCE_FUND_TARGET
              ? `Đã vượt mức gợi ý ${formatVnd(INSURANCE_FUND_TARGET)}`
              : `${insurancePct}% mức gợi ý ${formatVnd(INSURANCE_FUND_TARGET)}`
          }
        />
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-border-c bg-surface-alt px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        <p>
          Mọi giao dịch trên MarketMMO đều thực hiện trong hệ thống (ký quỹ, ví, thanh toán) — nghiêm cấm dẫn khách ra ngoài nền tảng.{" "}
          <Link href="/dieu-khoan-ban-hang" className="font-semibold text-foreground underline decoration-brand-dark/40 underline-offset-2 hover:decoration-brand-dark">
            Điều khoản bán hàng
          </Link>
        </p>
      </div>

      {/* Grid chính */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* Cột trái */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <SectionTitle aside={<span className="text-[11px] font-semibold text-muted">{revenueTrend.length > 10 ? "Gộp theo tuần" : "Theo ngày"}</span>}>
              Doanh số theo thời gian
            </SectionTitle>
            {hasRevenue ? <SellerOverviewChart bars={revenueTrend} /> : <EmptyState icon={BarChart3}>Chưa có doanh số trong kỳ này.</EmptyState>}
          </Card>

          <Card>
            <SectionTitle aside={<span className="text-[11px] text-muted">{statusTotal} đơn trong kỳ</span>}>Trạng thái đơn hàng</SectionTitle>
            {statusTotal === 0 ? (
              <EmptyState icon={PackageX}>Chưa có đơn hàng nào trong kỳ này.</EmptyState>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-alt">
                  {statusEntries.map(
                    (e) => e.count > 0 && <span key={e.key} className={statusDotClass[e.key]} style={{ width: `${(e.count / statusTotal) * 100}%` }} />
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {statusEntries.map((e) => (
                    <div key={e.key} className="flex items-center gap-2 text-xs">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass[e.key]}`} />
                      <span className="truncate text-muted">{orderStatusLabel[e.key]}</span>
                      <span className="ml-auto font-black tabular-nums text-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <SectionTitle aside={<span className="text-[11px] text-muted">Bấm để xem gian hàng</span>}>Sản phẩm bán chạy</SectionTitle>
            {topProducts.length === 0 ? (
              <EmptyState icon={Package}>Chưa có sản phẩm nào bán được trong kỳ này.</EmptyState>
            ) : (
              <div className="flex flex-col">
                {topProducts.map((p, i) => (
                  <Link key={p.slug + i} href={shopHref} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black ${i === 0 ? "bg-brand text-ink shadow-sm" : "bg-surface-alt text-muted"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-foreground">{p.productName}</p>
                      <p className="truncate text-[11px] text-muted">
                        {p.categoryName} · đã bán {p.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-black tabular-nums text-foreground">{formatVnd(p.revenue)}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle aside={<Link href="/trang-ban-hang/don-san-pham" className="text-[11px] font-bold text-brand-dark hover:underline">Xem tất cả →</Link>}>
              Đơn hàng gần đây
            </SectionTitle>
            {recentOrders.length === 0 ? (
              <EmptyState icon={PackageX}>Chưa có đơn hàng nào.</EmptyState>
            ) : (
              <div className="flex flex-col">
                {recentOrders.map((o) => (
                  <Link key={o.id} href={shopHref} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass[o.status]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-foreground">{o.productName}</p>
                      <p className="truncate text-[11px] text-muted">
                        {o.buyerName} · {o.status === "DISPUTED" ? "đang tranh chấp" : formatRelativeTime(o.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black tabular-nums text-foreground">{formatVnd(o.amount)}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Cột phải */}
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle>Cần xử lý</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {attentionItems.map((item) => (
                <Link key={item.title} href={item.href} className="flex items-center gap-3 rounded-xl bg-surface-alt p-3 transition hover:bg-border-c">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.wrap}`}>
                    <item.icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
                    <p className="truncate text-[10.5px] text-muted">{item.sub}</p>
                  </div>
                  <span
                    className={`grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-xs font-black ${
                      item.count > 0 ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {storeSnapshot && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-border-c bg-gradient-to-br from-ink to-ink-soft px-5 py-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-black text-ink">
                  {storeSnapshot.shopName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{storeSnapshot.shopName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {storeSnapshot.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                        <BadgeCheck className="h-3 w-3" /> Đã xác thực
                      </span>
                    )}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">Level {storeSnapshot.level}</span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-brand-dark text-brand-dark" />
                  <b className="tabular-nums text-foreground">{storeSnapshot.avgRating.toFixed(1)}</b>
                  <span className="text-xs text-muted">({storeSnapshot.reviewCount} đánh giá)</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                    <span className="shrink-0 text-muted">Quỹ bảo hiểm</span>
                    <b className="truncate tabular-nums text-foreground">
                      {formatVnd(storeSnapshot.insuranceBalance)} / {formatVnd(INSURANCE_FUND_TARGET)}
                    </b>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand" style={{ width: `${insurancePct}%` }} />
                  </div>
                </div>
                <Link href={shopHref} className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-border-c py-2.5 text-xs font-bold text-foreground transition hover:bg-surface-alt">
                  Xem gian hàng công khai <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle>Mẹo tăng doanh số</SectionTitle>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
                <PackageX className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <p className="text-xs text-muted">Nhập kho dữ liệu thật + bật giao hàng tự động để đơn hoàn tất nhanh hơn.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
