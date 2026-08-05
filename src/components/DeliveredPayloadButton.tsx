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
export default function DeliveredPayloadButton({ orderItemId }: { orderItemId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [contents, setContents] = useState<string[]>([]);
  const [expiresAtList, setExpiresAtList] = useState<(string | null)[]>([]);

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
        <PackageOpen className="h-3 w-3" /> Xem thông tin đã giao
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
