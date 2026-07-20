"use client";

import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";

type Dispute = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED_REFUND" | "RESOLVED_RELEASE";
  createdAt: string;
  openedBy: { email: string | null; username: string | null; name: string | null };
  orderItem: {
    productName: string;
    price: number;
    quantity: number;
    product: { seller: { shopName: string } } | null;
  };
};

// Bấm vào 1 dòng khiếu nại mở modal chi tiết đầy đủ (thay vì action button
// ngay trên dòng) — khớp bản demo Artifact đã được duyệt. openId=null nghĩa
// là đang không mở modal nào.
export default function AdminDisputesPanel({ openId }: { openId?: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(openId ?? null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/disputes");
    if (res.ok) {
      const data = await res.json();
      setDisputes(data.disputes);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleAction = async (id: string, action: "refund_buyer" | "release_seller") => {
    setBusyId(id);
    await fetch(`/api/admin/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    setActiveId(null);
    load();
  };

  const openDisputes = disputes.filter((d) => d.status === "OPEN");
  const resolved = disputes.filter((d) => d.status !== "OPEN");
  const active = disputes.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          Khiếu nại đang chờ xử lý ({openDisputes.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
        ) : openDisputes.length === 0 ? (
          <AdminEmptyState>Không có khiếu nại nào đang chờ xử lý.</AdminEmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {openDisputes.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveId(d.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-left shadow-sm transition hover:border-[var(--adm-brand)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--adm-text)]">{d.orderItem.productName}</p>
                  <p className="truncate text-xs text-[var(--adm-muted)]">
                    Người bán: {d.orderItem.product?.seller.shopName ?? "—"} · Mở bởi{" "}
                    {d.openedBy.name ?? d.openedBy.username ?? d.openedBy.email} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <span className="shrink-0 text-base font-black text-[var(--adm-danger)]">
                  {formatVnd(d.orderItem.price * d.orderItem.quantity)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Đã xử lý</h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
            {resolved.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-[var(--adm-text)]">{d.orderItem.productName}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    d.status === "RESOLVED_REFUND"
                      ? "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
                      : "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                  }`}
                >
                  {d.status === "RESOLVED_REFUND" ? "Đã hoàn tiền buyer" : "Đã giải ngân seller"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[var(--adm-text)]">{active.orderItem.productName}</h3>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
                  Người bán: {active.orderItem.product?.seller.shopName ?? "—"}
                </p>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="rounded-full p-1 text-[var(--adm-muted)] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Lý do khiếu nại</p>
                <p className="mt-1 text-[var(--adm-text)]">{active.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Mở bởi</p>
                  <p className="mt-1 truncate text-[var(--adm-text)]">
                    {active.openedBy.name ?? active.openedBy.username ?? active.openedBy.email}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Số tiền</p>
                  <p className="mt-1 font-black text-[var(--adm-brand)]">
                    {formatVnd(active.orderItem.price * active.orderItem.quantity)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--adm-muted)]">
                Mở lúc {new Date(active.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <AdminButton
                variant="danger"
                disabled={busyId === active.id}
                onClick={() => handleAction(active.id, "refund_buyer")}
              >
                <X className="h-3.5 w-3.5" /> Hoàn tiền người mua
              </AdminButton>
              <AdminButton
                variant="success"
                disabled={busyId === active.id}
                onClick={() => handleAction(active.id, "release_seller")}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Giải ngân người bán
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
