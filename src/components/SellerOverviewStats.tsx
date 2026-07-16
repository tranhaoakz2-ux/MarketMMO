import { Coins, Info, Lock, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { formatVnd } from "@/lib/format";
import type { RangeKey } from "@/lib/constants";

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
];

function toInputDate(d?: string) {
  if (!d) return "";
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export default function SellerOverviewStats({
  range,
  from,
  to,
  revenueStats,
  walletSummary,
}: {
  range: RangeKey;
  from?: string;
  to?: string;
  revenueStats: { releasedRevenue: number; escrowHeld: number; orderCount: number };
  walletSummary: { walletBalance: number; insuranceBalance: number };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-ink">Quản trị doanh thu</h1>
            <p className="text-xs text-muted">
              Theo dõi dòng tiền và hiệu quả kinh doanh gian hàng của bạn.
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
                    : "border-border-c text-ink/70 hover:bg-surface-alt"
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
            className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none"
          />
          <span className="text-xs text-muted">—</span>
          <input
            type="date"
            name="to"
            defaultValue={toInputDate(to)}
            className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none"
          />
          <button
            type="submit"
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              range === "custom"
                ? "bg-brand text-ink"
                : "bg-surface-alt text-ink hover:bg-border-c"
            }`}
          >
            Lọc
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface-alt p-4 text-xs text-ink/80">
        <p className="flex items-center gap-1.5 font-bold text-ink">
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
          icon={Coins}
          iconClass="bg-brand text-ink"
          label={`Doanh thu (${revenueStats.orderCount} đơn)`}
          value={formatVnd(revenueStats.releasedRevenue)}
        />
        <StatCard
          icon={Lock}
          iconClass="bg-ink text-white"
          label="Tiền tạm giữ (ký quỹ)"
          value={formatVnd(revenueStats.escrowHeld)}
        />
        <StatCard
          icon={Wallet}
          iconClass="bg-success text-white"
          label="Số dư ví"
          value={formatVnd(walletSummary.walletBalance)}
        />
        <StatCard
          icon={ShieldCheck}
          iconClass="bg-info text-white"
          label="Quỹ bảo hiểm"
          value={formatVnd(walletSummary.insuranceBalance)}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: typeof Coins;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-c bg-surface p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-1 text-lg font-black text-ink">{value}</p>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
}
