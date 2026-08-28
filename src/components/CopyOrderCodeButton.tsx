"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Nút sao chép mã đơn hàng — thuần hiển thị/tiện ích UI (giống CopyField ở
// DepositPanel.tsx), không đụng tới dữ liệu/logic đơn hàng nào. `label` cho
// nơi gọi khác (vd UserProfilePanel.tsx dùng lại nút này để copy ID thành
// viên, không phải mã đơn hàng) ghi đè nhãn trợ năng cho đúng ngữ cảnh.
export default function CopyOrderCodeButton({ code, label = "Sao chép mã đơn hàng" }: { code: string; label?: string }) {
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
      aria-label={label}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${
        copied ? "text-success" : "text-muted hover:bg-surface-alt hover:text-brand-dark"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
