"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";

// Biểu đồ cột "Doanh số theo thời gian" — TÁCH RIÊNG (client, có hover tooltip)
// để SellerOverviewStats vẫn là Server Component (lọc kỳ bằng Link + date-form
// navigate). KHÔNG dùng chung RevenueChart (admin đang dùng), giữ đúng thiết kế
// đã duyệt ở bản demo.
export default function SellerOverviewChart({ bars }: { bars: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 660;
  const H = 210;
  const padB = 26;
  const padT = 12;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const slot = W / Math.max(bars.length, 1);
  const barW = Math.min(34, slot * 0.5);
  const chartH = H - padB - padT;
  const yOf = (v: number) => padT + chartH - (v / max) * chartH;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Biểu đồ doanh số theo thời gian">
        <defs>
          <linearGradient id="seller-bar" x1="0" y1="0" x2="0" y2="1">
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
          const bh = Math.max(2, (b.value / max) * chartH);
          const active = hover === i;
          return (
            <g key={`${b.label}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * slot} y={padT} width={slot} height={chartH} fill="transparent" />
              <rect
                x={cx - barW / 2}
                y={yOf(b.value)}
                width={barW}
                height={bh}
                rx={5}
                fill="url(#seller-bar)"
                className="transition-opacity"
                opacity={hover === null || active ? 1 : 0.45}
              />
              {i === bars.length - 1 && <circle cx={cx} cy={yOf(b.value)} r={3.5} className="fill-brand-dark" />}
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
