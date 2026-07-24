"use client";

import { Banknote, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TextInput,
  Tone,
} from "@/components/seller-demo/DemoKit";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  note: string | null;
  createdAt: string;
};

const QUICK = [100000, 200000, 500000, 1000000];

const STATUS_TONE: Record<WalletTxStatus, Tone> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
};

export default function SellerWithdrawPanel({ walletBalance }: { walletBalance: number }) {
  const [amount, setAmount] = useState<number | null>(100000);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(walletBalance);

  const loadWithdrawals = async () => {
    const res = await fetch("/api/seller/withdraw-request");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
    }
  };

  useEffect(() => {
    (async () => {
      await loadWithdrawals();
    })();
  }, []);

  const handleSubmit = async () => {
    if (!amount || amount < 50000) {
      setError("Số tiền rút tối thiểu là 50.000đ.");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin ngân hàng nhận tiền.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/seller/withdraw-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể tạo yêu cầu rút tiền.");
      return;
    }
    setMessage("Đã gửi yêu cầu rút tiền — số tiền đã được khoá khỏi ví, chờ admin xử lý.");
    setBalance((b) => b - amount);
    loadWithdrawals();
  };

  const columns: Column<Withdrawal>[] = [
    {
      key: "time",
      header: "Thời gian",
      primary: true,
      render: (w) => <span className="whitespace-nowrap text-foreground">{new Date(w.createdAt).toLocaleString("vi-VN")}</span>,
    },
    { key: "bank", header: "Ngân hàng", render: (w) => <span className="block max-w-[240px] truncate text-muted">{w.note ?? "—"}</span> },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (w) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVnd(Math.abs(w.amount))}</span>,
    },
    { key: "status", header: "Trạng thái", render: (w) => <StatusBadge tone={STATUS_TONE[w.status]} dot>{walletTxStatusLabel[w.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rút tiền" subtitle="Rút số dư ví về tài khoản ngân hàng của bạn. Admin duyệt trong 24h làm việc." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card>
          <SectionTitle>Tạo yêu cầu rút tiền</SectionTitle>

          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Chọn nhanh số tiền</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold tabular-nums transition ${
                  amount === v ? "border-brand-dark bg-brand text-ink" : "border-border-c bg-surface text-foreground hover:bg-surface-alt"
                }`}
              >
                {formatVnd(v)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hoặc nhập số tiền khác" hint="Tối thiểu 50.000đ">
              <TextInput type="number" value={amount ?? ""} onChange={(e) => setAmount(Number(e.target.value) || null)} placeholder="Nhập số tiền (VNĐ)" />
            </Field>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-brand-dark/30 bg-brand-light/10 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Banknote className="h-4 w-4 text-brand-dark" /> Thông tin ngân hàng nhận tiền
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ngân hàng">
                <TextInput value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank" />
              </Field>
              <Field label="Số tài khoản">
                <TextInput value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Chủ tài khoản">
                  <TextInput value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="NGUYEN VAN A" />
                </Field>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">{message}</p>}

          <div className="mt-4">
            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Đang xử lý..." : "Gửi yêu cầu rút tiền"}
            </Button>
          </div>
        </Card>

        {/* Số dư */}
        <div className="flex flex-col gap-4">
          <Card padding="p-0" className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand to-brand-dark p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70">
                <Wallet className="h-3.5 w-3.5" /> Số dư khả dụng
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-ink">{formatVnd(balance)}</p>
            </div>
            <div className="p-4 text-xs text-muted">
              Khi gửi yêu cầu, số tiền được <b className="text-foreground">khoá khỏi ví ngay</b> để tránh tiêu trùng,
              chờ admin duyệt. Bị từ chối sẽ hoàn lại đủ.
            </div>
          </Card>
        </div>
      </div>

      {/* Lịch sử */}
      <Card>
        <SectionTitle>Lịch sử rút tiền</SectionTitle>
        <DataTable
          columns={columns}
          rows={withdrawals}
          rowKey={(w) => w.id}
          empty={<EmptyState icon={Wallet} title="Chưa có yêu cầu">Yêu cầu rút tiền của bạn sẽ hiện ở đây.</EmptyState>}
        />
      </Card>
    </div>
  );
}
