"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { INSURANCE_FUND_TARGET, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";
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
} from "@/components/seller-demo/DemoKit";

type Deposit = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  createdAt: string;
};

const QUICK = [50000, 100000, 200000, 300000];

export default function SellerInsurancePanel({
  walletBalance,
  insuranceBalance,
}: {
  walletBalance: number;
  insuranceBalance: number;
}) {
  const [amount, setAmount] = useState<number | null>(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balance, setBalance] = useState(walletBalance);
  const [insurance, setInsurance] = useState(insuranceBalance);

  const loadDeposits = async () => {
    const res = await fetch("/api/seller/insurance-deposit");
    if (res.ok) {
      const data = await res.json();
      setDeposits(data.deposits);
    }
  };

  useEffect(() => {
    (async () => {
      await loadDeposits();
    })();
  }, []);

  const handleSubmit = async () => {
    if (!amount || amount < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/seller/insurance-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể nạp quỹ bảo hiểm.");
      return;
    }
    setMessage("Đã nạp quỹ bảo hiểm thành công.");
    setBalance((b) => b - amount);
    setInsurance((i) => i + amount);
    loadDeposits();
  };

  const progress = Math.min(100, Math.round((insurance / INSURANCE_FUND_TARGET) * 100));

  const columns: Column<Deposit>[] = [
    { key: "time", header: "Thời gian", primary: true, render: (d) => <span className="whitespace-nowrap text-foreground">{new Date(d.createdAt).toLocaleString("vi-VN")}</span> },
    { key: "amount", header: "Số tiền", align: "right", render: (d) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVnd(Math.abs(d.amount))}</span> },
    { key: "status", header: "Trạng thái", render: (d) => <StatusBadge tone="success" dot>{walletTxStatusLabel[d.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quỹ bảo hiểm"
        subtitle="Không bắt buộc — là tín hiệu tin cậy hiển thị cho người mua, giúp gian hàng uy tín hơn."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Form nạp */}
        <Card>
          <SectionTitle>Nạp quỹ bảo hiểm</SectionTitle>
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
          <div className="mt-4 sm:max-w-xs">
            <Field label="Hoặc nhập số tiền khác" hint="Tối thiểu 10.000đ · trừ thẳng từ ví, tự cộng quỹ ngay">
              <TextInput type="number" value={amount ?? ""} onChange={(e) => setAmount(Number(e.target.value) || null)} placeholder="Nhập số tiền (VNĐ)" />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted">
            Số dư ví khả dụng: <b className="text-foreground">{formatVnd(balance)}</b>
          </p>
          {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">{message}</p>}
          <div className="mt-4">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? "Đang xử lý..." : "Nạp quỹ bảo hiểm"}
            </Button>
          </div>
        </Card>

        {/* Tiến độ quỹ */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Quỹ hiện có</p>
              <p className="text-2xl font-black tabular-nums text-foreground">{formatVnd(insurance)}</p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted">Mức gợi ý {formatVnd(INSURANCE_FUND_TARGET)}</span>
              <b className="tabular-nums text-foreground">{progress}%</b>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="text-[11px] text-muted">Đạt mức gợi ý giúp tăng độ tin cậy hiển thị trên trang sản phẩm.</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Lịch sử nạp quỹ</SectionTitle>
        <DataTable
          columns={columns}
          rows={deposits}
          rowKey={(d) => d.id}
          empty={<EmptyState icon={ShieldCheck} title="Chưa nạp lần nào">Nạp quỹ bảo hiểm để tăng uy tín gian hàng.</EmptyState>}
        />
      </Card>
    </div>
  );
}
