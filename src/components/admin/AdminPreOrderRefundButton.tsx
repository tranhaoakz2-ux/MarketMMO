"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/admin-demo/AdminDemoKit";

// Quét + hoàn tiền toàn bộ đơn đặt trước quá hạn giao (isPreOrder=true,
// deliveredPayload vẫn null, deliveryDeadline đã qua) — xem POST
// /api/admin/preorders/refund-overdue. Sàn chưa có cron tự động, admin bấm
// tay hoặc gắn vào lịch chạy định kỳ (Vercel Cron/Task Scheduler) khi triển
// khai thật — cùng quy ước AdminEscrowReleaseButton.
export default function AdminPreOrderRefundButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleRefund = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/preorders/refund-overdue", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(
      res.ok
        ? `Đã hoàn tiền ${data.refunded} đơn đặt trước quá hạn.`
        : (data.error ?? "Hoàn tiền thất bại.")
    );
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="secondary" disabled={busy} onClick={handleRefund}>
        <RotateCcw className="h-4 w-4" /> {busy ? "Đang xử lý..." : "Hoàn tiền đặt trước quá hạn"}
      </Button>
      {msg && <span className="text-[11px] font-semibold text-[var(--adm-muted)]">{msg}</span>}
    </div>
  );
}
