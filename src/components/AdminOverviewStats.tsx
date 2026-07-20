import {
  AlertCircle,
  ArrowUpRight,
  Gavel,
  Lock,
  ScrollText,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import RevenueChart from "@/components/RevenueChart";
import { formatRelativeTime, formatVnd } from "@/lib/format";
import { type RangeKey } from "@/lib/constants";
import type { AdminActivityItem } from "@/lib/queries";

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
];

const activityIcon: Record<AdminActivityItem["type"], typeof Users> = {
  USER_JOINED: UserPlus,
  SELLER_JOINED: Users,
  DISPUTE_OPENED: ShieldAlert,
  PRODUCT_PENDING: AlertCircle,
  AUDIT: ScrollText,
};

const activityIconClass: Record<AdminActivityItem["type"], string> = {
  USER_JOINED: "bg-[var(--adm-info-bg)] text-[var(--adm-info)]",
  SELLER_JOINED: "bg-[var(--adm-success-bg)] text-[var(--adm-success)]",
  DISPUTE_OPENED: "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]",
  PRODUCT_PENDING: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]",
  AUDIT: "bg-white/[0.08] text-[var(--adm-muted)]",
};

function toInputDate(d?: string) {
  if (!d) return "";
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export default function AdminOverviewStats({
  adminName,
  range,
  from,
  to,
  stats,
  previousGmv,
  revenueTrend,
  activity,
  counts,
}: {
  adminName: string;
  range: RangeKey;
  from?: string;
  to?: string;
  stats: { gmv: number; orderCount: number; newUsers: number; newSellers: number; escrowTotal: number };
  previousGmv: number;
  revenueTrend: { label: string; value: number }[];
  activity: AdminActivityItem[];
  counts: {
    pendingProducts: number;
    pendingCategories: number;
    pendingVerifications: number;
    pendingForumReports: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    openDisputes: number;
  };
}) {
  const deltaPct =
    previousGmv > 0 ? Math.round(((stats.gmv - previousGmv) / previousGmv) * 100) : null;

  const actionItems = [
    { label: "Khiếu nại đang mở", count: counts.openDisputes, href: "/admin/khieu-nai" },
    { label: "Sản phẩm chờ duyệt", count: counts.pendingProducts, href: "/admin/san-pham" },
    { label: "Danh mục mới chờ duyệt", count: counts.pendingCategories, href: "/admin/danh-muc" },
    { label: "Xác thực CCCD chờ duyệt", count: counts.pendingVerifications, href: "/admin/xac-thuc" },
    { label: "Báo cáo diễn đàn chờ xử lý", count: counts.pendingForumReports, href: "/admin/dien-dan" },
    { label: "Yêu cầu nạp tiền chờ duyệt", count: counts.pendingDeposits, href: "/admin/nap-tien" },
    { label: "Yêu cầu rút tiền chờ duyệt", count: counts.pendingWithdrawals, href: "/admin/rut-tien" },
  ];
  const actionTotal = actionItems.reduce((s, i) => s + i.count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-[var(--adm-text)]">Chào {adminName} 👋</h1>
        <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
          Toàn cảnh nền tảng MarketMMO — số liệu cập nhật theo thời gian thực.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((opt) => (
          <Link
            key={opt.key}
            href={`/admin?range=${opt.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              range === opt.key
                ? "border-[var(--adm-brand)] bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
                : "border-[var(--adm-border)] text-[var(--adm-muted)] hover:bg-white/5"
            }`}
          >
            {opt.label}
          </Link>
        ))}
        <form
          action="/admin"
          method="get"
          className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--adm-border)] px-2 py-1"
        >
          <input type="hidden" name="range" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={toInputDate(from)}
            className="rounded-md bg-transparent px-1.5 py-1 text-xs text-[var(--adm-text)] outline-none"
          />
          <span className="text-xs text-[var(--adm-muted)]">—</span>
          <input
            type="date"
            name="to"
            defaultValue={toInputDate(to)}
            className="rounded-md bg-transparent px-1.5 py-1 text-xs text-[var(--adm-text)] outline-none"
          />
          <button
            type="submit"
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              range === "custom" ? "bg-[var(--adm-brand)] text-[#14141f]" : "text-[var(--adm-muted)]"
            }`}
          >
            Lọc
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          iconClass="bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
          label={`Tổng giá trị giao dịch (${stats.orderCount} đơn)`}
          value={formatVnd(stats.gmv)}
          delta={deltaPct}
          href="/admin/don-hang"
        />
        <KpiCard
          icon={UserPlus}
          iconClass="bg-[var(--adm-info-bg)] text-[var(--adm-info)]"
          label="Người dùng mới"
          value={`${stats.newUsers}`}
          sub={`${stats.newSellers} gian hàng mới`}
          href="/admin/nguoi-dung"
        />
        <KpiCard
          icon={Lock}
          iconClass="bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]"
          label="Đang ký quỹ"
          value={formatVnd(stats.escrowTotal)}
          sub="Toàn hệ thống, hiện tại"
          href="/admin/don-hang?status=ESCROW"
        />
        <KpiCard
          icon={AlertCircle}
          iconClass="bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
          label="Việc cần xử lý"
          value={`${actionTotal}`}
          sub="Xem chi tiết bên dưới"
          href="#can-xu-ly"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4 min-w-0">
          <AdminCardChart revenueTrend={revenueTrend} />

          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-[var(--adm-text)]">Hoạt động gần đây</h2>
              <Link href="/admin/nhat-ky" className="text-[11px] font-bold text-[var(--adm-info)] hover:underline">
                Nhật ký đầy đủ →
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--adm-muted)]">Chưa có hoạt động nào.</p>
            ) : (
              <div className="flex flex-col">
                {activity.map((a) => {
                  const Icon = activityIcon[a.type];
                  return (
                    <Link
                      key={a.id}
                      href={a.href}
                      className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${activityIconClass[a.type]}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[var(--adm-text)]">{a.title}</p>
                        <p className="truncate text-[11px] text-[var(--adm-muted)]">{a.sub}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-[var(--adm-muted)]">
                        {formatRelativeTime(a.createdAt)}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--adm-muted)] opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            id="can-xu-ly"
            className="scroll-mt-20 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm"
          >
            <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Cần xử lý</h2>
            <div className="flex flex-col gap-2">
              {actionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl bg-[var(--adm-surface-2)] p-3 transition hover:bg-white/[0.06]"
                >
                  <p className="min-w-0 flex-1 text-xs font-semibold text-[var(--adm-text)]">{item.label}</p>
                  <span
                    className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-black ${
                      item.count > 0
                        ? "bg-[var(--adm-danger)] text-[#1a0605]"
                        : "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/admin/dau-gia"
            className="flex items-center gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm transition hover:border-[var(--adm-brand)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]">
              <Gavel className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--adm-text)]">Đấu giá vị trí vàng</p>
              <p className="text-[11px] text-[var(--adm-muted)]">Quản lý 6 vị trí, gán thủ công, giải quyết phiên</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminCardChart({ revenueTrend }: { revenueTrend: { label: string; value: number }[] }) {
  return (
    <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-black text-[var(--adm-text)]">Tổng giá trị giao dịch theo thời gian</h2>
        <span className="text-[11px] text-[var(--adm-muted)]">
          {revenueTrend.length > 10 ? "Gộp theo tuần" : "Theo ngày"}
        </span>
      </div>
      <RevenueChart bars={revenueTrend} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  sub,
  href,
}: {
  icon: typeof Wallet;
  iconClass: string;
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border-2 border-[var(--adm-brand)]/40 bg-[var(--adm-surface)] p-4 shadow-sm transition hover:border-[var(--adm-brand)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        {delta !== undefined && delta !== null && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0
                ? "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                : "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--adm-muted)]">{label}</p>
        <p className="mt-0.5 text-lg font-black text-[var(--adm-text)]">{value}</p>
      </div>
      {sub && <p className="text-[11px] text-[var(--adm-muted)]">{sub}</p>}
    </Link>
  );
}
