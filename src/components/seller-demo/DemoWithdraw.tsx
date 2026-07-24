"use client";

import { Banknote, Wallet } from "lucide-react";
import { useState } from "react";
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
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import { WITHDRAWALS, type DemoWithdrawal } from "@/components/seller-demo/mock";

const BALANCE = 8640000;
const QUICK = [100000, 200000, 500000, 1000000];

const STATUS_TONE: Record<WalletTxStatus, "warn" | "success" | "danger"> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
};

export default function DemoWithdraw() {
  const [amount, setAmount] = useState(100000);

  const columns: Column<DemoWithdrawal>[] = [
    { key: "time", header: "Thời gian", primary: true, render: (w) => <span className="whitespace-nowrap text-foreground">{w.createdAt}</span> },
    { key: "bank", header: "Ngân hàng", render: (w) => <span className="text-muted">{w.bank}</span> },
    { key: "amount", header: "Số tiền", align: "right", render: (w) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVndDemo(w.amount)}</span> },
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
                {formatVndDemo(v)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hoặc nhập số tiền khác" hint="Tối thiểu 50.000đ">
              <TextInput type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
            </Field>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-brand-dark/30 bg-brand-light/10 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Banknote className="h-4 w-4 text-brand-dark" /> Thông tin ngân hàng nhận tiền
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ngân hàng"><TextInput placeholder="VD: Vietcombank" /></Field>
              <Field label="Số tài khoản"><TextInput placeholder="0123456789" /></Field>
              <div className="sm:col-span-2">
                <Field label="Chủ tài khoản"><TextInput placeholder="NGUYEN VAN A" /></Field>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button className="w-full sm:w-auto">Gửi yêu cầu rút tiền</Button>
          </div>
        </Card>

        {/* Số dư */}
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-br from-ink to-ink-soft p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
                <Wallet className="h-3.5 w-3.5" /> Số dư khả dụng
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-white">{formatVndDemo(BALANCE)}</p>
            </div>
            <div className="p-4 text-xs text-muted">
              Khi gửi yêu cầu, số tiền được <b className="text-foreground">khoá khỏi ví ngay</b> để tránh
              tiêu trùng, chờ admin duyệt. Bị từ chối sẽ hoàn lại đủ.
            </div>
          </Card>
        </div>
      </div>

      {/* Lịch sử */}
      <Card>
        <SectionTitle>Lịch sử rút tiền</SectionTitle>
        <DataTable
          columns={columns}
          rows={WITHDRAWALS}
          rowKey={(w) => w.id}
          empty={<EmptyState icon={Wallet} title="Chưa có yêu cầu">Yêu cầu rút tiền của bạn sẽ hiện ở đây.</EmptyState>}
        />
      </Card>
    </div>
  );
}
