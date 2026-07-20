"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminBadge, AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";
import { walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  note: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

const badgeVariant: Record<WalletTxStatus, "warn" | "success" | "danger"> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
};

export default function AdminWithdrawalsPanel() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/withdrawals");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
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
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = withdrawals.filter((w) => w.status === "PENDING");
  const processed = withdrawals.filter((w) => w.status !== "PENDING");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          Yêu cầu rút tiền chờ duyệt ({pending.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
        ) : pending.length === 0 ? (
          <AdminEmptyState>Không có yêu cầu rút tiền nào đang chờ duyệt.</AdminEmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((w) => (
              <AdminCard key={w.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--adm-text)]">
                    {w.user.name ?? w.user.username ?? w.user.email}
                  </p>
                  <p className="text-xs text-[var(--adm-muted)]">{new Date(w.createdAt).toLocaleString("vi-VN")}</p>
                  {w.note && <p className="mt-1 text-xs text-[var(--adm-muted)]">{w.note}</p>}
                  <p className="mt-1 text-xs font-semibold text-[var(--adm-brand)]">
                    Số tiền đã được khoá khỏi ví người bán khi tạo yêu cầu — Từ chối sẽ hoàn lại, Duyệt chỉ đánh dấu
                    đã chuyển khoản.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-[var(--adm-brand)]">{formatVnd(Math.abs(w.amount))}</span>
                  <AdminButton variant="success" disabled={busyId === w.id} onClick={() => handleAction(w.id, "approve")}>
                    <Check className="h-3.5 w-3.5" /> Đã chuyển khoản
                  </AdminButton>
                  <AdminButton variant="danger" disabled={busyId === w.id} onClick={() => handleAction(w.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Từ chối (hoàn tiền)
                  </AdminButton>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử rút tiền</h2>
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
            processed.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-4 gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-[var(--adm-text)]">
                  {w.user.name ?? w.user.username ?? w.user.email}
                </span>
                <span className="font-bold text-[var(--adm-text)]">{formatVnd(Math.abs(w.amount))}</span>
                <span className="text-[var(--adm-muted)]">{new Date(w.createdAt).toLocaleDateString("vi-VN")}</span>
                <AdminBadge variant={badgeVariant[w.status]}>{walletTxStatusLabel[w.status]}</AdminBadge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
