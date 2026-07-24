"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { INSURANCE_FUND_TARGET } from "@/lib/constants";
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
import { INSURANCE_BALANCE, INSURANCE_HISTORY, type DemoInsuranceDeposit } from "@/components/seller-demo/mock";

const BALANCE = 8640000;
const QUICK = [50000, 100000, 200000, 300000];

export default function DemoInsurance() {
  const [amount, setAmount] = useState(100000);
  const progress = Math.min(100, Math.round((INSURANCE_BALANCE / INSURANCE_FUND_TARGET) * 100));

  const columns: Column<DemoInsuranceDeposit>[] = [
    { key: "time", header: "Thời gian", primary: true, render: (d) => <span className="whitespace-nowrap text-foreground">{d.createdAt}</span> },
    { key: "amount", header: "Số tiền", align: "right", render: (d) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVndDemo(d.amount)}</span> },
    { key: "status", header: "Trạng thái", render: () => <StatusBadge tone="success" dot>Đã cộng quỹ</StatusBadge> },
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
                {formatVndDemo(v)}
              </button>
            ))}
          </div>
          <div className="mt-4 sm:max-w-xs">
            <Field label="Hoặc nhập số tiền khác" hint="Tối thiểu 10.000đ · trừ thẳng từ ví, tự cộng quỹ ngay">
              <TextInput type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted">
            Số dư ví khả dụng: <b className="text-foreground">{formatVndDemo(BALANCE)}</b>
          </p>
          <div className="mt-4">
            <Button><ShieldCheck className="h-4 w-4" /> Nạp quỹ bảo hiểm</Button>
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
              <p className="text-2xl font-black tabular-nums text-foreground">{formatVndDemo(INSURANCE_BALANCE)}</p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted">Mức gợi ý {formatVndDemo(INSURANCE_FUND_TARGET)}</span>
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
          rows={INSURANCE_HISTORY}
          rowKey={(d) => d.id}
          empty={<EmptyState icon={ShieldCheck} title="Chưa nạp lần nào">Nạp quỹ bảo hiểm để tăng uy tín gian hàng.</EmptyState>}
        />
      </Card>
    </div>
  );
}
