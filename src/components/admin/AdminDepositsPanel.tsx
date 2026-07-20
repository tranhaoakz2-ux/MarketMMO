"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminBadge, AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";
import { walletMethodLabel, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Deposit = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  gatewayRef: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

const badgeVariant: Record<WalletTxStatus, "warn" | "success" | "danger"> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
};

export default function AdminDepositsPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/deposits");
    if (res.ok) {
      const data = await res.json();
      setDeposits(data.deposits);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/deposits/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = deposits.filter((d) => d.status === "PENDING");
  const processed = deposits.filter((d) => d.status !== "PENDING");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          Yêu cầu nạp tiền chờ duyệt ({pending.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
        ) : pending.length === 0 ? (
          <AdminEmptyState>Không có yêu cầu nào đang chờ duyệt.</AdminEmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((d) => (
              <AdminCard key={d.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--adm-text)]">
                    {d.user.name ?? d.user.username ?? d.user.email}
                  </p>
                  <p className="text-xs text-[var(--adm-muted)]">
                    {walletMethodLabel[d.method ?? ""] ?? d.method ?? "—"} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN")}
                  </p>
                  {d.note && <p className="mt-1 text-xs text-[var(--adm-muted)]">Ghi chú: {d.note}</p>}
                  {d.method === "usdt" && d.gatewayRef && (
                    <a
                      href={`https://tronscan.org/#/transaction/${d.gatewayRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--adm-info)] hover:underline"
                    >
                      Xem giao dịch trên Tronscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-[var(--adm-brand)]">{formatVnd(d.amount)}</span>
                  <AdminButton variant="success" disabled={busyId === d.id} onClick={() => handleAction(d.id, "approve")}>
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </AdminButton>
                  <AdminButton variant="danger" disabled={busyId === d.id} onClick={() => handleAction(d.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </AdminButton>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử xử lý nạp tiền</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <div className="grid grid-cols-4 gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
            <span>Người dùng</span>
            <span>Số tiền</span>
            <span>Thời gian</span>
            <span>Trạng thái</span>
          </div>
          {processed.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--adm-muted)]">Chưa có giao dịch nào.</div>
          ) : (
            processed.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-4 gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-[var(--adm-text)]">
                  {d.user.name ?? d.user.username ?? d.user.email}
                </span>
                <span className="font-bold text-[var(--adm-text)]">{formatVnd(d.amount)}</span>
                <span className="text-[var(--adm-muted)]">{new Date(d.createdAt).toLocaleDateString("vi-VN")}</span>
                <AdminBadge variant={badgeVariant[d.status]}>{walletTxStatusLabel[d.status]}</AdminBadge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
