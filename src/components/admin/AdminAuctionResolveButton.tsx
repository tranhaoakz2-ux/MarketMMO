"use client";

import { Gavel } from "lucide-react";
import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminUi";

export default function AdminAuctionResolveButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleResolve = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/auction/resolve", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(
      res.ok
        ? `Đã xử lý ${data.resolved} vị trí đến hạn (${data.winners} có người thắng).`
        : (data.error ?? "Giải quyết đấu giá thất bại.")
    );
    if (res.ok) onDone();
  };

  return (
    <div className="flex items-center gap-3">
      <AdminButton variant="brand" disabled={busy} onClick={handleResolve}>
        <Gavel className="h-3.5 w-3.5" /> {busy ? "Đang xử lý..." : "Giải quyết slot đến hạn"}
      </AdminButton>
      {msg && <span className="text-xs font-semibold text-[var(--adm-muted)]">{msg}</span>}
    </div>
  );
}
