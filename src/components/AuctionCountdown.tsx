"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s, expired: false };
}

export default function AuctionCountdown({
  endAt,
  size = "md",
}: {
  endAt: string | Date;
  size?: "sm" | "md";
}) {
  const target = new Date(endAt).getTime();
  // Start as `null` so server and first client render both show the same
  // placeholder — the real (second-precision) value is only computed after
  // mount, avoiding a hydration mismatch on a value that ticks every second.
  const [remaining, setRemaining] = useState<ReturnType<typeof formatRemaining> | null>(
    null
  );

  useEffect(() => {
    (async () => {
      setRemaining(formatRemaining(target - Date.now()));
    })();
    const interval = setInterval(() => {
      setRemaining(formatRemaining(target - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  // Giảm 30% so với cỡ gốc (text-lg 18px / text-3xl+text-4xl 30px+36px) và
  // đổi từ font-black (900, dày) sang font-medium + tracking-wide cho dáng
  // chữ thanh mảnh, tinh tế hơn — theo yêu cầu tường minh.
  const textSize = size === "sm" ? "text-[12.6px]" : "text-[21px] sm:text-[25px]";

  if (!remaining) {
    return (
      <span className={`font-medium tracking-wide tabular-nums text-foreground/30 ${textSize}`}>
        --g --p --s
      </span>
    );
  }

  if (remaining.expired) {
    return <span className="font-bold text-muted">Đang chờ giải quyết...</span>;
  }

  return (
    <span className={`font-medium tracking-wide tabular-nums text-foreground ${textSize}`}>
      {remaining.d > 0 && <span className="text-danger">{remaining.d}n </span>}
      {String(remaining.h).padStart(2, "0")}g {String(remaining.m).padStart(2, "0")}p{" "}
      {String(remaining.s).padStart(2, "0")}s
    </span>
  );
}
