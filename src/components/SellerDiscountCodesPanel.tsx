"use client";

import { Loader2, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-dashed border-brand-dark/40 bg-brand-light/15 p-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">Tạo mã giảm giá mới</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Mã (VD: SALE10)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SALE10"
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm uppercase focus:border-brand-dark focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Loại giảm giá</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            >
              <option value="PERCENT">Theo % (tối đa 100)</option>
              <option value="FIXED">Số tiền cố định (VNĐ)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Giá trị {type === "PERCENT" ? "(%)" : "(VNĐ)"}
            </label>
            <input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Số lần dùng tối đa (bỏ trống = không giới hạn)
            </label>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Không giới hạn"
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Ngày hết hạn (bỏ trống = không hết hạn)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none sm:w-1/2"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={submitting || !code}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
          Tạo mã
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Danh sách mã giảm giá</h2>
        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Bạn chưa tạo mã giảm giá nào.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {codes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="font-mono text-sm font-black text-foreground">{c.code}</p>
                  <p className="text-xs text-muted">
                    {c.type === "PERCENT" ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`} · Đã
                    dùng {c.usedCount}
                    {c.maxUses ? `/${c.maxUses}` : ""} lần
                    {c.expiresAt && ` · Hết hạn ${new Date(c.expiresAt).toLocaleDateString("vi-VN")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(c.id, !c.active)}
                    disabled={busyId === c.id}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                      c.active
                        ? "bg-success/10 text-success"
                        : "bg-surface-alt text-muted"
                    }`}
                  >
                    {c.active ? "Đang bật" : "Đã tắt"}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-full bg-danger/10 p-2 text-danger transition hover:bg-danger/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
