import {
  AlertTriangle,
  BadgeCheck,
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
import RevenueChart from "@/components/RevenueChart";
import { formatRelativeTime, formatVnd } from "@/lib/format";
import {
  INSURANCE_FUND_TARGET,
  orderStatusLabel,
  type OrderStatus,
  type RangeKey,
} from "@/lib/constants";

const rangeOptions: { key: RangeKey; label: string }[] = [
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
  const deltaPct =
    previousRevenue > 0
      ? Math.round(((revenueStats.releasedRevenue - previousRevenue) / previousRevenue) * 100)
      : null;

  const statusEntries = (["RELEASED", "ESCROW", "DISPUTED", "CANCELLED"] as const).map((key) => ({
    key,
    count: orderStatusBreakdown[key],
  }));
  const statusTotal = statusEntries.reduce((s, e) => s + e.count, 0);

  // Luôn hiện đủ 3 mục (khác bản demo hiển thị tĩnh) — kể cả khi count = 0,
  // để seller biết đây là 3 nhóm hệ thống LUÔN theo dõi, không phải chỉ xuất
  // hiện khi có việc. count = 0 đổi sang huy hiệu màu success (an tâm) thay
  // vì màu đỏ cảnh báo.
  const attentionItems = [
    {
      href: "/trang-ban-hang/san-pham",
      icon: Package,
      iconClass: "bg-brand-light text-brand-dark",
      title: "Sản phẩm chờ duyệt",
      sub: "Admin chưa duyệt xong",
      count: attentionCounts.pendingProducts,
    },
    {
      href: "/trang-ban-hang/khieu-nai",
      icon: AlertTriangle,
      iconClass: "bg-danger/10 text-danger",
      title: "Khiếu nại đang mở",
      sub: "Cần bạn phản hồi buyer",
      count: attentionCounts.openDisputes,
    },
    {
      href: "/trang-ban-hang/san-pham",
      icon: TrendingDown,
      iconClass: "bg-info/10 text-info",
      title: "Sắp hết hàng",
      sub: "Kho thật còn dưới 3 đơn vị",
      count: attentionCounts.lowStock,
    },
  ];

  const insurancePct = Math.min(
    100,
    Math.round((walletSummary.insuranceBalance / INSURANCE_FUND_TARGET) * 100)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-foreground">Tổng quan</h1>
            <p className="text-xs text-muted">
              Theo dõi dòng tiền, đơn hàng và những việc cần xử lý cho gian hàng của bạn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((opt) => (
              <Link
                key={opt.key}
                href={`/trang-ban-hang?range=${opt.key}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  range === opt.key
                    ? "border-brand-dark bg-brand text-ink"
                    : "border-border-c text-foreground/70 hover:bg-surface-alt"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        <form
          action="/trang-ban-hang"
          method="get"
          className="flex flex-wrap items-center gap-2 border-t border-border-c pt-4"
        >
          <input type="hidden" name="range" value="custom" />
          <span className="text-xs font-semibold text-muted">Tuỳ chọn:</span>
          <input
            type="date"
            name="from"
            defaultValue={toInputDate(from)}
            className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
          <span className="text-xs text-muted">—</span>
          <input
            type="date"
            name="to"
            defaultValue={toInputDate(to)}
            className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
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

      <div className="rounded-2xl border border-border-c bg-surface-alt p-4 text-xs text-foreground/80">
        <p className="flex items-center gap-1.5 font-bold text-foreground">
          <Info className="h-3.5 w-3.5 text-info" /> Quy định giao dịch
        </p>
        <p className="mt-1.5">
          Mọi giao dịch trên MarketMMO đều phải thực hiện trong hệ thống (ký quỹ, ví, thanh
          toán) — nghiêm cấm dẫn khách ra ngoài nền tảng. Xem đầy đủ tại{" "}
          <Link href="/dieu-khoan-ban-hang" className="font-semibold text-info hover:underline">
            Điều khoản bán hàng
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PiggyBank}
          iconClass="bg-brand text-ink"
          label={`Doanh thu (${revenueStats.orderCount} đơn)`}
          value={formatVnd(revenueStats.releasedRevenue)}
          delta={deltaPct}
          sub={previousRevenue > 0 ? `So với kỳ trước: ${formatVnd(previousRevenue)}` : undefined}
        />
        <StatCard
          icon={Lock}
          iconClass="bg-brand-light text-brand-dark"
          label="Tiền tạm giữ (ký quỹ)"
          value={formatVnd(revenueStats.escrowHeld)}
        />
        <StatCard
          icon={Wallet}
          iconClass="bg-success/10 text-success"
          label="Số dư ví"
          value={formatVnd(walletSummary.walletBalance)}
          linkHref="/trang-ban-hang/rut-tien"
          linkLabel="Rút tiền"
        />
        <StatCard
          icon={ShieldCheck}
          iconClass="bg-info/10 text-info"
          label="Quỹ bảo hiểm"
          value={formatVnd(walletSummary.insuranceBalance)}
          sub={
            walletSummary.insuranceBalance >= INSURANCE_FUND_TARGET
              ? `Đã vượt mức gợi ý ${formatVnd(INSURANCE_FUND_TARGET)}`
              : `${insurancePct}% mức gợi ý ${formatVnd(INSURANCE_FUND_TARGET)}`
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-foreground">Doanh số theo thời gian</h2>
              <span className="text-[11px] text-muted">
                {revenueTrend.length > 10 ? "Gộp theo tuần" : "Theo ngày"}
              </span>
            </div>
            <RevenueChart bars={revenueTrend} />
          </div>

          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-foreground">Trạng thái đơn hàng</h2>
              <span className="text-[11px] text-muted">{statusTotal} đơn trong kỳ</span>
            </div>
            {statusTotal === 0 ? (
              <p className="py-3 text-center text-xs text-muted">Chưa có đơn hàng nào trong kỳ này.</p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-alt">
                  {statusEntries.map(
                    (e) =>
                      e.count > 0 && (
                        <span
                          key={e.key}
                          className={statusDotClass[e.key]}
                          style={{ width: `${(e.count / statusTotal) * 100}%` }}
                        />
                      )
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {statusEntries.map((e) => (
                    <div key={e.key} className="flex items-center gap-2 text-xs text-foreground/80">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass[e.key]}`} />
                      {orderStatusLabel[e.key]}
                      <span className="ml-auto font-bold text-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-foreground">Sản phẩm bán chạy</h2>
              <span className="text-[11px] text-muted">Bấm để xem gian hàng</span>
            </div>
            {topProducts.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted">Chưa có sản phẩm nào bán được trong kỳ này.</p>
            ) : (
              topProducts.map((p, i) => (
                <Link
                  key={p.slug + i}
                  href={storeSnapshot ? `/shop/${storeSnapshot.slug}` : "#"}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-black ${
                      i === 0 ? "bg-brand text-ink" : "bg-surface-alt text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{p.productName}</p>
                    <p className="truncate text-[11px] text-muted">
                      {p.categoryName} · đã bán {p.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-black text-foreground">{formatVnd(p.revenue)}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-foreground">Đơn hàng gần đây</h2>
              <Link
                href="/trang-ban-hang/don-san-pham"
                className="text-[11px] font-bold text-info hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted">
                <PackageX className="h-6 w-6 text-muted" />
                Chưa có đơn hàng nào.
              </div>
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={storeSnapshot ? `/shop/${storeSnapshot.slug}` : "#"}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass[o.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{o.productName}</p>
                    <p className="truncate text-[11px] text-muted">
                      {o.buyerName} ·{" "}
                      {o.status === "DISPUTED" ? "đang tranh chấp" : formatRelativeTime(o.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-foreground">{formatVnd(o.amount)}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black text-foreground">Cần xử lý</h2>
            <div className="flex flex-col gap-2">
              {attentionItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl bg-surface-alt p-3 transition hover:bg-border-c"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.iconClass}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[10.5px] text-muted">{item.sub}</p>
                  </div>
                  <span
                    className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-black ${
                      item.count > 0 ? "bg-danger text-white" : "bg-success/10 text-success"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {storeSnapshot && (
            <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-black text-foreground">Gian hàng của bạn</h2>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-base font-black text-brand">
                  {storeSnapshot.shopName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{storeSnapshot.shopName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {storeSnapshot.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                        <BadgeCheck className="h-3 w-3" /> Đã xác thực
                      </span>
                    )}
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted">
                      LV {storeSnapshot.level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <Star className="h-3.5 w-3.5 fill-brand-dark text-brand-dark" />
                <b className="text-foreground">{storeSnapshot.avgRating.toFixed(1)}</b>
                <span className="text-muted">({storeSnapshot.reviewCount} đánh giá)</span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted">Quỹ bảo hiểm</span>
                  <b className="text-foreground">
                    {formatVnd(storeSnapshot.insuranceBalance)} / {formatVnd(INSURANCE_FUND_TARGET)}
                  </b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand"
                    style={{ width: `${insurancePct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  sub,
  linkHref,
  linkLabel,
}: {
  icon: typeof PiggyBank;
  iconClass: string;
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-brand bg-surface p-4 shadow-sm transition hover:border-brand-dark">
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        {delta !== undefined && delta !== null && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-black text-foreground">{value}</p>
      </div>
      {sub && !linkHref && <p className="text-[11px] text-muted">{sub}</p>}
      {linkHref && (
        <Link href={linkHref} className="text-[11px] font-bold text-info hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
