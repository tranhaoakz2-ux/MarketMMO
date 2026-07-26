"use client";

// Panel THẬT "Rút tiền" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoWithdrawals.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành
// vi vẫn THẬT: fetch GET /api/admin/withdrawals, POST
// /api/admin/withdrawals/[id] {action:"approve"|"reject"} — không đổi 1
// dòng logic nghiệp vụ (Duyệt chỉ đánh dấu, Từ chối hoàn tiền — đụng tiền
// thật). API route đã có sẵn requireAdmin() (không đụng tới).
import { Check, Inbox, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  type Column,
  DataTable,
  EmptyState,
  ListSkeleton,
  StatusBadge,
  TableSkeleton,
  type Tone,
  formatVndDemo,
} from "@/components/admin-demo/AdminDemoKit";
import { walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  note: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

const toneOf: Record<WalletTxStatus, Tone> = {
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

  const columns: Column<Withdrawal>[] = [
    {
      key: "user",
      header: "Người dùng",
      primary: true,
      render: (w) => <span className="truncate font-semibold text-[var(--adm-text)]">{w.user.name ?? w.user.username ?? w.user.email}</span>,
    },
    { key: "amount", header: "Số tiền", align: "right", render: (w) => <span className="font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(Math.abs(w.amount))}</span> },
    { key: "time", header: "Thời gian", render: (w) => <span className="text-xs text-[var(--adm-muted)]">{new Date(w.createdAt).toLocaleDateString("vi-VN")}</span> },
    { key: "status", header: "Trạng thái", render: (w) => <StatusBadge tone={toneOf[w.status]} dot>{walletTxStatusLabel[w.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          {loading ? "Đang tải..." : `Yêu cầu rút tiền chờ duyệt (${pending.length})`}
        </h2>
        {loading ? (
          <ListSkeleton />
        ) : pending.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Không có yêu cầu rút tiền nào đang chờ duyệt" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((w) => (
              <Card key={w.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--adm-text)]">{w.user.name ?? w.user.username ?? w.user.email}</p>
                  <p className="text-xs text-[var(--adm-muted)]">{new Date(w.createdAt).toLocaleString("vi-VN")}</p>
                  {w.note && <p className="mt-1 text-xs text-[var(--adm-muted)]">{w.note}</p>}
                  <p className="mt-1 text-xs font-semibold text-[var(--adm-brand)]">
                    Số tiền đã được khoá khỏi ví người bán khi tạo yêu cầu — Từ chối sẽ hoàn lại, Duyệt chỉ đánh dấu
                    đã chuyển khoản.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-[var(--adm-brand)]">{formatVndDemo(Math.abs(w.amount))}</span>
                  <Button variant="success" disabled={busyId === w.id} onClick={() => handleAction(w.id, "approve")}>
                    <Check className="h-3.5 w-3.5" /> Đã chuyển khoản
                  </Button>
                  <Button variant="danger" disabled={busyId === w.id} onClick={() => handleAction(w.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Từ chối (hoàn tiền)
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử rút tiền</h2>
        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={columns}
            rows={processed}
            rowKey={(w) => w.id}
            empty={<EmptyState icon={Inbox} title="Chưa có giao dịch nào" />}
          />
        )}
      </div>
    </div>
  );
}
