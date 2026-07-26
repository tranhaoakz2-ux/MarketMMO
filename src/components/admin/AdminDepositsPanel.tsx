"use client";

// Panel THẬT "Nạp tiền" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoDeposits.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT: fetch GET /api/admin/deposits, POST /api/admin/deposits/[id]
// {action:"approve"|"reject"} — không đổi 1 dòng logic nghiệp vụ (duyệt
// nạp tiền là thao tác đụng tiền thật). API route đã có sẵn requireAdmin()
// (không đụng tới).
import { Check, ExternalLink, Inbox, X } from "lucide-react";
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

const toneOf: Record<WalletTxStatus, Tone> = {
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

  const columns: Column<Deposit>[] = [
    {
      key: "user",
      header: "Người dùng",
      primary: true,
      render: (d) => <span className="truncate font-semibold text-[var(--adm-text)]">{d.user.name ?? d.user.username ?? d.user.email}</span>,
    },
    { key: "amount", header: "Số tiền", align: "right", render: (d) => <span className="font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(d.amount)}</span> },
    { key: "time", header: "Thời gian", render: (d) => <span className="text-xs text-[var(--adm-muted)]">{new Date(d.createdAt).toLocaleDateString("vi-VN")}</span> },
    { key: "status", header: "Trạng thái", render: (d) => <StatusBadge tone={toneOf[d.status]} dot>{walletTxStatusLabel[d.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          {loading ? "Đang tải..." : `Yêu cầu nạp tiền chờ duyệt (${pending.length})`}
        </h2>
        {loading ? (
          <ListSkeleton />
        ) : pending.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Không có yêu cầu nào đang chờ duyệt" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((d) => (
              <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--adm-text)]">{d.user.name ?? d.user.username ?? d.user.email}</p>
                  <p className="text-xs text-[var(--adm-muted)]">
                    {walletMethodLabel[d.method ?? ""] ?? d.method ?? "—"} · {new Date(d.createdAt).toLocaleString("vi-VN")}
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
                  <span className="text-base font-black text-[var(--adm-brand)]">{formatVndDemo(d.amount)}</span>
                  <Button variant="success" disabled={busyId === d.id} onClick={() => handleAction(d.id, "approve")}>
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </Button>
                  <Button variant="danger" disabled={busyId === d.id} onClick={() => handleAction(d.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử xử lý nạp tiền</h2>
        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={columns}
            rows={processed}
            rowKey={(d) => d.id}
            empty={<EmptyState icon={Inbox} title="Chưa có giao dịch nào" />}
          />
        )}
      </div>
    </div>
  );
}
