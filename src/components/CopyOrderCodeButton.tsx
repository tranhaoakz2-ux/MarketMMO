"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Nút sao chép mã đơn hàng — thuần hiển thị/tiện ích UI (giống CopyField ở
// DepositPanel.tsx), không đụng tới dữ liệu/logic đơn hàng nào.
export default function CopyOrderCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Sao chép mã đơn hàng"
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${
        copied ? "text-success" : "text-muted hover:bg-surface-alt hover:text-brand-dark"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
