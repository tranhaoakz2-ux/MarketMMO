"use client";

import { Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  SectionTitle,
  Select,
  StatusBadge,
  TextInput,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import { DISCOUNT_CODES, type DemoDiscountCode } from "@/components/seller-demo/mock";

export default function DemoDiscountCodes() {
  const [codes, setCodes] = useState<DemoDiscountCode[]>(DISCOUNT_CODES);
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");

  const toggle = (id: string) =>
    setCodes((cs) => cs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  const remove = (id: string) => setCodes((cs) => cs.filter((c) => c.id !== id));

  const columns: Column<DemoDiscountCode>[] = [
    {
      key: "code",
      header: "Mã",
      primary: true,
      render: (c) => (
        <div>
          <p className="font-mono text-sm font-black tracking-wide text-foreground">{c.code}</p>
          <p className="text-[11px] text-muted">
            {c.type === "PERCENT" ? `Giảm ${c.value}%` : `Giảm ${formatVndDemo(c.value)}`}
          </p>
        </div>
      ),
    },
    {
      key: "uses",
      header: "Lượt dùng",
      align: "right",
      render: (c) => (
        <span className="tabular-nums text-foreground">
          {c.usedCount}
          <span className="text-muted">{c.maxUses ? ` / ${c.maxUses}` : " / ∞"}</span>
        </span>
      ),
    },
    { key: "expires", header: "Hết hạn", render: (c) => <span className="whitespace-nowrap text-muted">{c.expiresAt ?? "Không"}</span> },
    {
      key: "status",
      header: "Trạng thái",
      render: (c) => (
        <button onClick={() => toggle(c.id)} className="transition hover:opacity-80">
          <StatusBadge tone={c.active ? "success" : "neutral"} dot>
            {c.active ? "Đang bật" : "Đã tắt"}
          </StatusBadge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      render: (c) => (
        <button
          onClick={() => remove(c.id)}
          title="Xoá mã"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-muted transition hover:border-danger hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mã giảm giá"
        subtitle="Tạo mã áp dụng cho toàn bộ sản phẩm gian hàng bạn. Người mua nhập ở giỏ hàng hoặc mua ngay."
      />

      {/* Form tạo mã */}
      <Card className="border-brand-dark/30">
        <SectionTitle>Tạo mã giảm giá mới</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mã (VD: SALE20)">
            <TextInput placeholder="SALE20" className="uppercase" />
          </Field>
          <Field label="Loại giảm giá">
            <Select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
              <option value="PERCENT">Theo % (tối đa 100)</option>
              <option value="FIXED">Số tiền cố định (VNĐ)</option>
            </Select>
          </Field>
          <Field label={type === "PERCENT" ? "Giá trị (%)" : "Giá trị (VNĐ)"}>
            <TextInput type="number" min={1} defaultValue={type === "PERCENT" ? "10" : "10000"} />
          </Field>
          <Field label="Số lần dùng tối đa" hint="Bỏ trống = không giới hạn">
            <TextInput type="number" min={1} placeholder="Không giới hạn" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ngày hết hạn" hint="Bỏ trống = không hết hạn">
              <TextInput type="date" className="sm:w-1/2" />
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Button><Tag className="h-4 w-4" /> Tạo mã</Button>
        </div>
      </Card>

      {/* Danh sách mã */}
      <Card>
        <SectionTitle aside={<span className="text-[11px] text-muted">{codes.length} mã</span>}>Danh sách mã giảm giá</SectionTitle>
        <DataTable
          columns={columns}
          rows={codes}
          rowKey={(c) => c.id}
          empty={<EmptyState icon={Tag} title="Chưa có mã nào">Tạo mã giảm giá đầu tiên để thu hút người mua.</EmptyState>}
        />
      </Card>
    </div>
  );
}
