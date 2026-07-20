"use client";

import { PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminUi";

export default function AdminEscrowReleaseButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleRelease = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/escrow/release", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Đã giải ngân ${data.released} mục đơn hàng đến hạn.` : (data.error ?? "Giải ngân thất bại."));
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <AdminButton variant="brand" disabled={busy} onClick={handleRelease}>
        <PackageCheck className="h-3.5 w-3.5" /> {busy ? "Đang xử lý..." : "Chạy giải ngân ký quỹ đến hạn"}
      </AdminButton>
      {msg && <span className="text-xs font-semibold text-[var(--adm-muted)]">{msg}</span>}
    </div>
  );
}
