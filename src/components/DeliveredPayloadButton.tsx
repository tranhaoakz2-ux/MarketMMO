"use client";

import { Check, Copy, PackageOpen } from "lucide-react";
import { useState } from "react";
import { formatDaysRemaining } from "@/lib/format";

const TONE_CLASS: Record<"danger" | "warn" | "safe", string> = {
  danger: "text-danger",
  warn: "text-brand-dark",
  safe: "text-muted",
};

// Hiện nội dung giao hàng thật (tài khoản/mã kích hoạt...) đã được hệ thống
// tự động gán cho đơn hàng này lúc checkout — xem model ProductStockItem +
// OrderItem.deliveredPayload. Chỉ render khi deliveredPayload có giá trị
// (sản phẩm/phiên bản có dùng kho thật); đơn hàng cũ/sản phẩm chưa nhập kho
// thật thì không có nút này, giữ nguyên hành vi cũ. `deliveredExpiresAt`
// (nếu có) là JSON mảng CÙNG thứ tự index với deliveredPayload — phần tử
// null nghĩa là đơn vị đó không có hạn (xem OrderItem.deliveredExpiresAt).
export default function DeliveredPayloadButton({
  deliveredPayload,
  deliveredExpiresAt,
}: {
  deliveredPayload: string;
  deliveredExpiresAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  let contents: string[] = [];
  try {
    const parsed = JSON.parse(deliveredPayload);
    contents = Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    contents = [deliveredPayload];
  }

  let expiresAtList: (string | null)[] = [];
  if (deliveredExpiresAt) {
    try {
      const parsed = JSON.parse(deliveredExpiresAt);
      expiresAtList = Array.isArray(parsed) ? parsed : [];
    } catch {
      expiresAtList = [];
    }
  }

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex((i) => (i === idx ? null : i)), 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success hover:underline"
      >
        <PackageOpen className="h-3 w-3" /> Xem thông tin đã giao
      </button>
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
