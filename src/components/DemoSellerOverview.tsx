"use client";

// ⚠️ DEMO — bản redesign trang "Tổng quan" của Quản Lý Bán Hàng.
// TÁCH BIỆT hoàn toàn khỏi trang thật: dữ liệu GIẢ (mock) khai báo ngay trong
// file, KHÔNG gọi backend, KHÔNG import SellerOverviewStats/RevenueChart thật.
// Chỉ dùng token màu thương hiệu + Tailwind v4, chạy được ở cả sáng và tối.

import {
  AlertTriangle,
  ArrowUpRight,
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
import { useState } from "react";
import { formatVnd } from "@/lib/format";

const INSURANCE_TARGET = 300_000;

// ---- MOCK DATA (giả lập, chỉ để xem giao diện) -----------------------------
const RANGES = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
] as const;

const MOCK = {
  revenue: 12_450_000,
  prevRevenue: 9_800_000,
  escrowHeld: 3_200_000,
  orderCount: 87,
  walletBalance: 8_640_000,
  insuranceBalance: 250_000,
  trend: [
    { label: "12/7", value: 900_000 },
    { label: "13/7", value: 1_450_000 },
    { label: "14/7", value: 1_100_000 },
    { label: "15/7", value: 1_820_000 },
    { label: "16/7", value: 1_500_000 },
    { label: "17/7", value: 2_240_000 },
    { label: "18/7", value: 1_950_000 },
    { label: "19/7", value: 2_600_000 },
    { label: "20/7", value: 2_300_000 },
    { label: "21/7", value: 3_120_000 },
  ],
  status: { RELEASED: 62, ESCROW: 15, DISPUTED: 3, CANCELLED: 7 },
  topProducts: [
    { name: "Gmail US random new, chưa đăng nhập thiết bị", category: "Gmail", qty: 214, revenue: 2_889_000 },
    { name: "Facebook Việt Nam 2FA, dễ đổi thông tin", category: "Facebook", qty: 168, revenue: 2_016_000 },
    { name: "ChatGPT Team cấp sẵn, dùng riêng", category: "ChatGPT", qty: 96, revenue: 1_632_000 },
    { name: "Discord Nitro 1 tháng", category: "Discord", qty: 74, revenue: 888_000 },
  ],
  recent: [
    { id: "1", product: "Gmail US random new", buyer: "buyerdemo", amount: 27_000, status: "RELEASED", time: "2 giờ trước" },
    { id: "2", product: "ChatGPT Team cấp sẵn", buyer: "haovegas222", amount: 220_000, status: "ESCROW", time: "5 giờ trước" },
    { id: "3", product: "Facebook Việt Nam 2FA", buyer: "refflow371", amount: 39_000, status: "ESCROW", time: "8 giờ trước" },
    { id: "4", product: "Discord Nitro 1 tháng", buyer: "aloha", amount: 340_000, status: "DISPUTED", time: "1 ngày trước" },
    { id: "5", product: "Gmail cổ 2015-2018", buyer: "cloudhouse", amount: 85_000, status: "RELEASED", time: "1 ngày trước" },
  ],
  attention: { pendingProducts: 2, openDisputes: 1, lowStock: 3 },
  store: {
    shopName: "AccVerse Store",
    level: 4,
    verified: true,
    insuranceBalance: 250_000,
    avgRating: 4.8,
    reviewCount: 126,
  },
};

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  RELEASED: { label: "Đã giải ngân", dot: "bg-success", text: "text-success" },
  ESCROW: { label: "Đang ký quỹ", dot: "bg-brand-dark", text: "text-brand-dark" },
  DISPUTED: { label: "Khiếu nại", dot: "bg-danger", text: "text-danger" },
  CANCELLED: { label: "Đã huỷ", dot: "bg-muted", text: "text-muted" },
};

// ---- Sparkline nhỏ cho thẻ KPI Doanh thu -----------------------------------
function Sparkline({ points }: { points: number[] }) {
  const W = 120;
  const H = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
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

// ---- Biểu đồ cột "Doanh số theo thời gian" ----------------------------------
function DemoBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 660;
  const H = 210;
  const padB = 26;
  const padT = 12;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const slot = W / bars.length;
  const barW = Math.min(34, slot * 0.5);
  const chartH = H - padB - padT;
  const yOf = (v: number) => padT + chartH - (v / max) * chartH;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ doanh số theo thời gian">
        <defs>
          <linearGradient id="demo-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--color-brand)" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-brand-dark)", stopOpacity: 0.75 }} />
          </linearGradient>
        </defs>
        {grid.map((g) => {
          const gy = padT + chartH * g;
          return <line key={g} x1="0" y1={gy} x2={W} y2={gy} className="stroke-border-c" strokeWidth={1} strokeOpacity={0.5} />;
        })}
        {bars.map((b, i) => {
          const cx = i * slot + slot / 2;
          const bh = Math.max(2, ((b.value / max) * chartH));
          const active = hover === i;
          return (
            <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * slot} y={padT} width={slot} height={chartH} fill="transparent" />
              <rect
                x={cx - barW / 2}
                y={yOf(b.value)}
                width={barW}
                height={bh}
                rx={5}
                fill="url(#demo-bar)"
                className="transition-opacity"
                opacity={hover === null || active ? 1 : 0.45}
              />
              {i === bars.length - 1 && (
                <circle cx={cx} cy={yOf(b.value)} r={3.5} className="fill-brand-dark" />
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-muted" style={{ fontSize: 10 }}>
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border-c bg-surface px-2.5 py-1.5 text-xs font-bold text-foreground shadow-md"
          style={{ left: `${((hover + 0.5) / bars.length) * 100}%`, top: 0 }}
        >
          <span className="block text-[10px] font-semibold text-muted">{bars[hover].label}</span>
          {formatVnd(bars[hover].value)}
        </div>
      )}
    </div>
  );
}

// ---- Thẻ KPI ----------------------------------------------------------------
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
  delta?: number;
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
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconWrap}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-black leading-tight tabular-nums text-foreground">{value}</p>
      {spark && <div className="mt-2"><Sparkline points={spark} /></div>}
      {sub && !linkHref && <p className="mt-2 text-[11px] text-muted">{sub}</p>}
      {linkHref && (
        <Link
          href={linkHref}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-dark transition hover:gap-1.5"
        >
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border-c bg-surface p-5 shadow-sm ${className}`}>{children}</div>
  );
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-black text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

export default function DemoSellerOverview() {
  const [range, setRange] = useState<string>("7d");
  const delta = Math.round(((MOCK.revenue - MOCK.prevRevenue) / MOCK.prevRevenue) * 100);
  const insurancePct = Math.min(100, Math.round((MOCK.insuranceBalance / INSURANCE_TARGET) * 100));
  const statusEntries = (["RELEASED", "ESCROW", "DISPUTED", "CANCELLED"] as const).map((k) => ({
    key: k,
    count: MOCK.status[k],
  }));
  const statusTotal = statusEntries.reduce((s, e) => s + e.count, 0);
  const sparkPoints = MOCK.trend.map((t) => t.value);

  const attentionItems = [
    { icon: Package, wrap: "bg-brand-light text-brand-dark", title: "Sản phẩm chờ duyệt", sub: "Admin chưa duyệt xong", count: MOCK.attention.pendingProducts },
    { icon: AlertTriangle, wrap: "bg-danger/10 text-danger", title: "Khiếu nại đang mở", sub: "Cần bạn phản hồi buyer", count: MOCK.attention.openDisputes },
    { icon: TrendingDown, wrap: "bg-info/10 text-info", title: "Sắp hết hàng", sub: "Kho thật còn dưới 3 đơn vị", count: MOCK.attention.lowStock },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Nhãn demo */}
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/15 px-3 py-2 text-[11px] font-bold text-brand-dark">
        <Info className="h-3.5 w-3.5" /> BẢN DEMO GIAO DIỆN · dữ liệu giả — trang thật không thay đổi
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Quản lý bán hàng</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">Tổng quan</h1>
          <p className="mt-1 text-sm text-muted">Theo dõi dòng tiền, đơn hàng và việc cần xử lý cho gian hàng của bạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-border-c bg-surface-alt p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                range === r.key
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={PiggyBank}
          iconWrap="bg-brand text-ink"
          label={`Doanh thu · ${MOCK.orderCount} đơn`}
          value={formatVnd(MOCK.revenue)}
          accent
          delta={delta}
          spark={sparkPoints}
        />
        <KpiCard
          icon={Lock}
          iconWrap="bg-brand-light text-brand-dark"
          label="Tiền tạm giữ (ký quỹ)"
          value={formatVnd(MOCK.escrowHeld)}
          sub="Sẽ giải ngân sau thời gian ký quỹ"
        />
        <KpiCard
          icon={Wallet}
          iconWrap="bg-success/10 text-success"
          label="Số dư ví"
          value={formatVnd(MOCK.walletBalance)}
          linkHref="/trang-ban-hang/rut-tien"
          linkLabel="Rút tiền"
        />
        <KpiCard
          icon={ShieldCheck}
          iconWrap="bg-info/10 text-info"
          label="Quỹ bảo hiểm"
          value={formatVnd(MOCK.insuranceBalance)}
          sub={`${insurancePct}% mức gợi ý ${formatVnd(INSURANCE_TARGET)}`}
        />
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-border-c bg-surface-alt px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        <p>
          Mọi giao dịch trên MarketMMO đều thực hiện trong hệ thống (ký quỹ, ví, thanh toán) — nghiêm cấm
          dẫn khách ra ngoài nền tảng.{" "}
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
            <SectionTitle aside={<span className="text-[11px] font-semibold text-muted">Theo ngày</span>}>
              Doanh số theo thời gian
            </SectionTitle>
            <DemoBarChart bars={MOCK.trend} />
          </Card>

          <Card>
            <SectionTitle aside={<span className="text-[11px] text-muted">{statusTotal} đơn trong kỳ</span>}>
              Trạng thái đơn hàng
            </SectionTitle>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-alt">
              {statusEntries.map(
                (e) =>
                  e.count > 0 && (
                    <span key={e.key} className={STATUS_META[e.key].dot} style={{ width: `${(e.count / statusTotal) * 100}%` }} />
                  )
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
              {statusEntries.map((e) => (
                <div key={e.key} className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[e.key].dot}`} />
                  <span className="text-muted">{STATUS_META[e.key].label}</span>
                  <span className="ml-auto font-black tabular-nums text-foreground">{e.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle aside={<span className="text-[11px] text-muted">Trong kỳ</span>}>Sản phẩm bán chạy</SectionTitle>
            <div className="flex flex-col">
              {MOCK.topProducts.map((p, i) => (
                <div key={p.name} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black ${
                      i === 0 ? "bg-brand text-ink shadow-sm" : "bg-surface-alt text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted">{p.category} · đã bán {p.qty}</p>
                  </div>
                  <span className="shrink-0 text-[13px] font-black tabular-nums text-foreground">{formatVnd(p.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle
              aside={
                <Link href="/trang-ban-hang/don-san-pham" className="text-[11px] font-bold text-brand-dark hover:underline">
                  Xem tất cả →
                </Link>
              }
            >
              Đơn hàng gần đây
            </SectionTitle>
            <div className="flex flex-col">
              {MOCK.recent.map((o) => (
                <div key={o.id} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-alt">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[o.status].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{o.product}</p>
                    <p className="truncate text-[11px] text-muted">
                      {o.buyer} · {o.status === "DISPUTED" ? "đang tranh chấp" : o.time}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-black tabular-nums text-foreground">{formatVnd(o.amount)}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Cột phải */}
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle>Cần xử lý</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {attentionItems.map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-xl bg-surface-alt p-3 transition hover:bg-border-c">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.wrap}`}>
                    <item.icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[10.5px] text-muted">{item.sub}</p>
                  </div>
                  <span
                    className={`grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-xs font-black ${
                      item.count > 0 ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                    }`}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-border-c bg-gradient-to-br from-ink to-ink-soft px-5 py-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-black text-ink">
                {MOCK.store.shopName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{MOCK.store.shopName}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {MOCK.store.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                      <BadgeCheck className="h-3 w-3" /> Đã xác thực
                    </span>
                  )}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">
                    Level {MOCK.store.level}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-brand-dark text-brand-dark" />
                <b className="tabular-nums text-foreground">{MOCK.store.avgRating.toFixed(1)}</b>
                <span className="text-xs text-muted">({MOCK.store.reviewCount} đánh giá)</span>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted">Quỹ bảo hiểm</span>
                  <b className="tabular-nums text-foreground">
                    {formatVnd(MOCK.store.insuranceBalance)} / {formatVnd(INSURANCE_TARGET)}
                  </b>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand" style={{ width: `${insurancePct}%` }} />
                </div>
              </div>
              <Link
                href="/shop/accverse"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-border-c py-2.5 text-xs font-bold text-foreground transition hover:bg-surface-alt"
              >
                Xem gian hàng công khai <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          {/* Empty-state mẫu (đẹp) — minh hoạ khi chưa có dữ liệu */}
          <Card>
            <SectionTitle>Mẹo tăng doanh số</SectionTitle>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
                <PackageX className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <p className="text-xs text-muted">
                Nhập kho dữ liệu thật + bật giao hàng tự động để đơn hoàn tất nhanh hơn.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
