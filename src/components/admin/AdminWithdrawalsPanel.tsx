"use client";

// Panel THẬT "Rút tiền" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoWithdrawals.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành
// vi vẫn THẬT: fetch GET /api/admin/withdrawals, POST
// /api/admin/withdrawals/[id] {action:"approve"|"reject"} — không đổi 1
// dòng logic nghiệp vụ (Duyệt chỉ đánh dấu, Từ chối hoàn tiền — đụng tiền
// thật). API route đã có sẵn requireAdmin() (không đụng tới).
//
// Rút USDT (TRC20, method="usdt_trc20"): hiện thêm địa chỉ ví/số USDT/tỷ
// giá đã khoá lúc seller tạo yêu cầu (KHÔNG tính lại ở đây) + ô nhập TxID
// on-chain TUỲ CHỌN trước khi bấm Duyệt, lưu vào gatewayRef làm bằng chứng
// đã chuyển — admin vẫn phải tự tay gửi USDT trước, hệ thống không tự động
// chuyển tiền ra.
import { Check, Inbox, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  type Column,
  DataTable,
  EmptyState,
  Field,
  ListSkeleton,
  StatusBadge,
  TableSkeleton,
  TextInput,
  type Tone,
  formatVndDemo,
} from "@/components/admin-demo/AdminDemoKit";
import { walletMethodLabel, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";
import { formatWithdrawRecipient } from "@/lib/format";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  recipientInfo: string | null;
  adminNote: string | null;
  gatewayRef: string | null;
  withdrawAddress: string | null;
  usdtAmount: number | null;
  exchangeRate: number | null;
  rateSource: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

const toneOf: Record<WalletTxStatus, Tone> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
  // EXPIRED chỉ thực sự xảy ra cho nạp ngân hàng (method="bank"), CANCELLED
  // chỉ xảy ra cho nạp DV.net (method="dvnet") — cả 2 không bao giờ xuất
  // hiện ở rút tiền, có mặt ở đây thuần để thoả kiểu dùng chung WalletTxStatus.
  EXPIRED: "danger",
  CANCELLED: "danger",
};

const RATE_SOURCE_LABEL: Record<string, string> = {
  coingecko: "CoinGecko",
  fallback: "Dự phòng",
};

export default function AdminWithdrawalsPanel() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [txidDraft, setTxidDraft] = useState<Record<string, string>>({});

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
    const gatewayRef = action === "approve" ? txidDraft[id]?.trim() : undefined;
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(gatewayRef ? { gatewayRef } : {}) }),
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
    {
      key: "detail",
      header: "Chi tiết",
      render: (w) =>
        w.method === "usdt_trc20" ? (
          <div className="max-w-[260px] text-[var(--adm-muted)]">
            <span className="block truncate font-mono text-[11px]">{w.withdrawAddress}</span>
            <span className="block text-[11px]">
              ≈ {w.usdtAmount} USDT @ {w.exchangeRate?.toLocaleString("vi-VN")}đ
            </span>
            {w.gatewayRef && <span className="block truncate text-[11px]">TxID: {w.gatewayRef}</span>}
          </div>
        ) : (
          <span className="block max-w-[220px] truncate text-[var(--adm-muted)]">
            {formatWithdrawRecipient(w.recipientInfo, w.note)}
          </span>
        ),
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
            {pending.map((w) => {
              const isUsdt = w.method === "usdt_trc20";
              return (
                <Card key={w.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--adm-text)]">{w.user.name ?? w.user.username ?? w.user.email}</p>
                      <p className="text-xs text-[var(--adm-muted)]">
                        {new Date(w.createdAt).toLocaleString("vi-VN")} · {walletMethodLabel[w.method ?? "bank"] ?? "Chuyển khoản ngân hàng"}
                      </p>
                      {isUsdt ? (
                        <div className="mt-1 text-xs text-[var(--adm-muted)]">
                          <p className="font-mono">{w.withdrawAddress}</p>
                          <p>
                            ≈ <b className="text-[var(--adm-brand)]">{w.usdtAmount} USDT</b> @{" "}
                            {w.exchangeRate?.toLocaleString("vi-VN")}đ/USDT (nguồn: {RATE_SOURCE_LABEL[w.rateSource ?? ""] ?? w.rateSource}, đã khoá lúc tạo yêu cầu)
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--adm-muted)]">
                          {formatWithdrawRecipient(w.recipientInfo, w.note)}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-semibold text-[var(--adm-brand)]">
                        Số tiền đã được khoá khỏi ví người bán khi tạo yêu cầu — Từ chối sẽ hoàn lại, Duyệt chỉ đánh dấu
                        đã chuyển{isUsdt ? " USDT" : " khoản"}.
                      </p>
                    </div>
                    <span className="text-base font-black text-[var(--adm-brand)]">{formatVndDemo(Math.abs(w.amount))}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {isUsdt && (
                      <div className="min-w-[220px] flex-1">
                        <Field label="TxID on-chain (tuỳ chọn)">
                          <TextInput
                            placeholder="Dán mã giao dịch sau khi đã chuyển USDT"
                            value={txidDraft[w.id] ?? ""}
                            onChange={(e) => setTxidDraft((prev) => ({ ...prev, [w.id]: e.target.value }))}
                          />
                        </Field>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      <Button variant="success" disabled={busyId === w.id} onClick={() => handleAction(w.id, "approve")}>
                        <Check className="h-3.5 w-3.5" /> Đã chuyển{isUsdt ? " USDT" : " khoản"}
                      </Button>
                      <Button variant="danger" disabled={busyId === w.id} onClick={() => handleAction(w.id, "reject")}>
                        <X className="h-3.5 w-3.5" /> Từ chối (hoàn tiền)
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
