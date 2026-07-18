"use client";

import { useRef, useState } from "react";
import { formatVnd } from "@/lib/format";

type Bar = { label: string; value: number };

// Biểu đồ cột doanh số theo ngày/tuần cho Trang Bán Hàng > Tổng quan. Vẽ
// bằng SVG (chỉ rect/line đơn giản, không phải path tay phức tạp) để dùng
// thẳng được màu theo class Tailwind (fill-brand...) thay vì phải đọc lại
// CSS variable trong JS như canvas thuần. Tooltip hover tính bằng cách so
// toạ độ X con trỏ (quy đổi theo tỉ lệ viewBox) với từng cột, không cần lớp
// canvas ẩn riêng để bắt sự kiện chuột.
export default function RevenueChart({ bars }: { bars: Bar[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; label: string; value: number } | null>(null);

  const W = 1200;
  const H = 260;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = Math.max(1, bars.length);
  const gap = n > 10 ? 6 : 22;
  const barW = (plotW - gap * (n - 1)) / n;
  const max = Math.max(1, ...bars.map((b) => b.value)) * 1.15;

  const rects = bars.map((b, i) => ({
    x: padL + i * (barW + gap),
    w: barW,
    h: (b.value / max) * plotH,
    y: padT + plotH - (b.value / max) * plotH,
    ...b,
  }));

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const hit = rects.find((r) => mx >= r.x - gap / 2 && mx <= r.x + r.w + gap / 2);
    if (hit) {
      setTooltip({ x: ((hit.x + hit.w / 2) / W) * 100, label: hit.label, value: hit.value });
    } else {
      setTooltip(null);
    }
  };

  if (bars.length === 0 || bars.every((b) => b.value === 0)) {
    return (
      <div className="grid h-[190px] place-items-center text-xs text-muted">
        Chưa có đơn hàng nào trong khoảng thời gian này.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-[190px] w-full cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padL}
            x2={W - padR}
            y1={padT + (plotH / 3) * i}
            y2={padT + (plotH / 3) * i}
            stroke="currentColor"
            className="text-ink/5"
            strokeWidth={1}
          />
        ))}
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.w}
            height={Math.max(2, r.h)}
            rx={Math.min(6, r.w / 2)}
            className={tooltip?.label === r.label ? "fill-brand-dark" : "fill-brand"}
          />
        ))}
        {rects.map((r, i) => (
          <text
            key={i}
            x={r.x + r.w / 2}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted text-[20px] font-semibold"
          >
            {n > 8 ? "" : r.label}
          </text>
        ))}
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
          style={{ left: `${tooltip.x}%` }}
        >
          {formatVnd(tooltip.value)}
          <span className="ml-1 font-medium opacity-70">· {tooltip.label}</span>
        </div>
      )}
    </div>
  );
}
