"use client";

import { Check, Copy, Loader2, PackageOpen } from "lucide-react";
import { useState } from "react";
import { formatDaysRemaining } from "@/lib/format";

const TONE_CLASS: Record<"danger" | "warn" | "safe", string> = {
  danger: "text-danger",
  warn: "text-brand-dark",
  safe: "text-muted",
};

// Hiện nội dung giao hàng thật (tài khoản/mã kích hoạt...) đã được hệ thống
// tự động gán cho đơn hàng này lúc checkout — xem model ProductStockItem +
// OrderItem.deliveredPayload. Chỉ render khi cha truyền vào (hasDeliveredPayload
// ở /don-hang), tức sản phẩm/phiên bản có dùng kho thật.
//
// KHÔNG nhận deliveredPayload qua prop nữa (trước đây nhúng thẳng vào SSR —
// nội dung đã có sẵn trong HTML dù buyer chưa bấm xem). Giờ bấm "Xem" mới
// gọi POST /api/orders/[orderItemId]/reveal-delivered — server ghi lại
// "buyer đã xem lúc nào" TRƯỚC khi trả nội dung (AUDIT LỊCH SỬ ĐƠN HÀNG —
// LỖ HỔNG 2). `deliveredExpiresAt` trả về là JSON mảng CÙNG thứ tự index với
// deliveredPayload — phần tử null nghĩa là đơn vị đó không có hạn.
//
// `mode="guide"` (TUT-Trick — nội dung hướng dẫn nhiều đoạn) đổi cách hiển
// thị: khối văn bản đọc được đầy đủ (`whitespace-pre-wrap`) thay vì chip
// `<code>` bị `truncate` 1 dòng (phù hợp cho "email|password" ngắn, nhưng
// sẽ cắt cụt 1 bài hướng dẫn dài) — vẫn dùng chung 100% API/log phía trên,
// chỉ khác phần render.
//
// `mode="tool"` (Tool/AI Agent) kết hợp CẢ HAI: quy trình sử dụng (khối văn
// bản như "guide") HIỂN THỊ TRƯỚC, rồi tới credential đã giải mã (chip như
// "credential") — server (reveal-delivered) đã tự giải mã sẵn, component
// này không biết/không cần biết gì về mã hoá, chỉ render `usageGuide` +
// `deliveredPayload` (plaintext) như bình thường.
export default function DeliveredPayloadButton({
  orderItemId,
  mode = "credential",
}: {
  orderItemId: string;
  mode?: "credential" | "guide" | "tool";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contents, setContents] = useState<string[]>([]);
  const [expiresAtList, setExpiresAtList] = useState<(string | null)[]>([]);
  const [usageGuide, setUsageGuide] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderItemId}/reveal-delivered`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải nội dung đã giao.");
      return;
    }

    let parsedContents: string[] = [];
    try {
      const parsed = JSON.parse(data.deliveredPayload);
      parsedContents = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      parsedContents = [data.deliveredPayload];
    }
    setContents(parsedContents);

    let parsedExpiry: (string | null)[] = [];
    if (data.deliveredExpiresAt) {
      try {
        const parsed = JSON.parse(data.deliveredExpiresAt);
        parsedExpiry = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedExpiry = [];
      }
    }
    setExpiresAtList(parsedExpiry);
    setUsageGuide(typeof data.usageGuide === "string" ? data.usageGuide : null);
  };

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex((i) => (i === idx ? null : i)), 1500);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success hover:underline"
      >
        <PackageOpen className="h-3 w-3" />
        {mode === "guide"
          ? "Xem hướng dẫn đầy đủ"
          : mode === "tool"
            ? "Xem quy trình + tài khoản"
            : "Xem thông tin đã giao"}
      </button>
    );
  }

  if (loading) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
        <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-1.5 flex flex-col items-start gap-1">
        <p className="rounded bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger">{error}</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] font-semibold text-muted hover:underline"
        >
          Ẩn đi
        </button>
      </div>
    );
  }

  if (mode === "guide" || mode === "tool") {
    return (
      <div className="mt-1.5 flex w-80 flex-col gap-1.5 rounded-lg border border-success/30 bg-success/5 p-2.5">
        {mode === "tool" && usageGuide && (
          <div className="rounded border border-border-c bg-surface p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase text-muted">Quy trình sử dụng</p>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
              {usageGuide}
            </p>
          </div>
        )}
        {mode === "tool" && (
          <p className="text-[10px] font-bold uppercase text-muted">Tài khoản của bạn</p>
        )}
        {contents.map((content, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2 rounded border border-border-c bg-surface p-2.5">
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
              {content}
            </p>
            <button
              onClick={() => handleCopy(content, idx)}
              className="shrink-0 rounded p-1 text-muted hover:bg-surface-alt hover:text-foreground"
              aria-label="Sao chép"
            >
              {copiedIndex === idx ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        ))}
        <button
          onClick={() => setOpen(false)}
          className="self-start text-[10px] font-semibold text-muted hover:underline"
        >
          Ẩn đi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex w-64 flex-col gap-1.5 rounded-lg border border-success/30 bg-success/5 p-2">
      {contents.map((content, idx) => {
        const expiresAtRaw = expiresAtList[idx];
        const expiry = expiresAtRaw ? formatDaysRemaining(expiresAtRaw) : null;
        return (
          <div key={idx} className="rounded border border-border-c bg-surface px-2 py-1">
            <div className="flex items-center justify-between gap-1.5">
              <code className="min-w-0 flex-1 truncate text-[11px] text-foreground">{content}</code>
              <button
                onClick={() => handleCopy(content, idx)}
                className="shrink-0 rounded p-1 text-muted hover:bg-surface-alt hover:text-foreground"
                aria-label="Sao chép"
              >
                {copiedIndex === idx ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            {expiry && (
              <p className={`mt-0.5 text-[10px] font-semibold ${TONE_CLASS[expiry.tone]}`}>
                {expiry.label}
              </p>
            )}
          </div>
        );
      })}
      <button
        onClick={() => setOpen(false)}
        className="self-start text-[10px] font-semibold text-muted hover:underline"
      >
        Ẩn đi
      </button>
    </div>
  );
}
