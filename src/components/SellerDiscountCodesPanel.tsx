"use client";

import { Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
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
} from "@/components/seller-demo/DemoKit";

type DiscountCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export default function SellerDiscountCodesPanel() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/seller/discount-codes");
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleCreate = async () => {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/seller/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể tạo mã giảm giá.");
      return;
    }
    setCode("");
    setValue("10");
    setMaxUses("");
    setExpiresAt("");
    load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    setBusyId(id);
    await fetch(`/api/seller/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setBusyId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá mã giảm giá này? Không ảnh hưởng đơn hàng đã dùng mã trước đó.")) return;
    setBusyId(id);
    await fetch(`/api/seller/discount-codes/${id}`, { method: "DELETE" });
    setBusyId(null);
    load();
  };

  const columns: Column<DiscountCode>[] = [
    {
      key: "code",
      header: "Mã",
      primary: true,
      render: (c) => (
        <div>
          <p className="font-mono text-sm font-black tracking-wide text-foreground">{c.code}</p>
          <p className="text-[11px] text-muted">
            {c.type === "PERCENT" ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
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
    {
      key: "expires",
      header: "Hết hạn",
      render: (c) => (
        <span className="whitespace-nowrap text-muted">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("vi-VN") : "Không"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (c) => (
        <button
          onClick={() => handleToggle(c.id, !c.active)}
          disabled={busyId === c.id}
          className="transition hover:opacity-80 disabled:opacity-50"
        >
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
          onClick={() => handleDelete(c.id)}
          disabled={busyId === c.id}
          title="Xoá mã"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-muted transition hover:border-danger hover:bg-danger/10 hover:text-danger disabled:opacity-50"
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
            <TextInput
              className="uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SALE20"
            />
          </Field>
          <Field label="Loại giảm giá">
            <Select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
              <option value="PERCENT">Theo % (tối đa 100)</option>
              <option value="FIXED">Số tiền cố định (VNĐ)</option>
            </Select>
          </Field>
          <Field label={type === "PERCENT" ? "Giá trị (%)" : "Giá trị (VNĐ)"}>
            <TextInput type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Số lần dùng tối đa" hint="Bỏ trống = không giới hạn">
            <TextInput
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Không giới hạn"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ngày hết hạn" hint="Bỏ trống = không hết hạn">
              <TextInput
                type="date"
                className="sm:w-1/2"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>
        )}
        <div className="mt-4">
          <Button onClick={handleCreate} disabled={submitting || !code}>
            <Tag className="h-4 w-4" /> {submitting ? "Đang tạo..." : "Tạo mã"}
          </Button>
        </div>
      </Card>

      {/* Danh sách mã */}
      <Card>
        <SectionTitle aside={!loading ? <span className="text-[11px] text-muted">{codes.length} mã</span> : undefined}>
          Danh sách mã giảm giá
        </SectionTitle>
        {loading ? (
          <p className="py-4 text-center text-sm text-muted">Đang tải...</p>
        ) : (
          <DataTable
            columns={columns}
            rows={codes}
            rowKey={(c) => c.id}
            empty={<EmptyState icon={Tag} title="Chưa có mã nào">Tạo mã giảm giá đầu tiên để thu hút người mua.</EmptyState>}
          />
        )}
      </Card>
    </div>
  );
}
