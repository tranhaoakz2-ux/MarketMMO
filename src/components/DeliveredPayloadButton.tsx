"use client";

import { Check, Copy, PackageOpen } from "lucide-react";
import { useState } from "react";

// Hiện nội dung giao hàng thật (tài khoản/mã kích hoạt...) đã được hệ thống
// tự động gán cho đơn hàng này lúc checkout — xem model ProductStockItem +
// OrderItem.deliveredPayload. Chỉ render khi deliveredPayload có giá trị
// (sản phẩm/phiên bản có dùng kho thật); đơn hàng cũ/sản phẩm chưa nhập kho
// thật thì không có nút này, giữ nguyên hành vi cũ.
export default function DeliveredPayloadButton({ deliveredPayload }: { deliveredPayload: string }) {
  const [open, setOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  let contents: string[] = [];
  try {
    const parsed = JSON.parse(deliveredPayload);
    contents = Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    contents = [deliveredPayload];
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
      {contents.map((content, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-1.5 rounded border border-border-c bg-surface px-2 py-1"
        >
          <code className="min-w-0 flex-1 truncate text-[11px] text-ink">{content}</code>
          <button
            onClick={() => handleCopy(content, idx)}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-alt hover:text-ink"
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
