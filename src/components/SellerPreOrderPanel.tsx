"use client";

import { Clock, Info, Loader2, Package, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  SectionTitle,
  Select,
  TextInput,
} from "@/components/seller-demo/DemoKit";
import type { Product } from "@/data/products";

type UnitOption = "hour" | "day";

export default function SellerPreOrderPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nháp form khi bật/sửa đặt trước cho 1 sản phẩm — reset mỗi lần mở dòng khác.
  const [deliveryValue, setDeliveryValue] = useState("3");
  const [deliveryUnit, setDeliveryUnit] = useState<UnitOption>("day");
  const [warrantyValue, setWarrantyValue] = useState("7");
  const [warrantyUnit, setWarrantyUnit] = useState<UnitOption>("day");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/seller/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const openEdit = (p: Product) => {
    setError(null);
    setEditingId(p.id);
    setDeliveryValue(p.preOrderDeliveryValue ? String(p.preOrderDeliveryValue) : "3");
    setDeliveryUnit(p.preOrderDeliveryUnit ?? "day");
    setWarrantyValue(p.warrantyValue ? String(p.warrantyValue) : "7");
    setWarrantyUnit(p.warrantyUnit ?? "day");
  };

  const handleTurnOff = async (productId: string) => {
    setBusyId(productId);
    const res = await fetch(`/api/seller/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preOrder: false }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, preOrder: false } : p)));
    }
    setBusyId(null);
  };

  const handleSave = async (productId: string) => {
    setBusyId(productId);
    setError(null);
    const res = await fetch(`/api/seller/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preOrder: true,
        preOrderDeliveryValue: Number(deliveryValue),
        preOrderDeliveryUnit: deliveryUnit,
        warrantyValue: Number(warrantyValue),
        warrantyUnit,
      }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setError(data?.error ?? "Không thể lưu — vui lòng thử lại.");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              preOrder: true,
              preOrderDeliveryValue: data.preOrderDeliveryValue,
              preOrderDeliveryUnit: data.preOrderDeliveryUnit,
              warrantyValue: data.warrantyValue,
              warrantyUnit: data.warrantyUnit,
            }
          : p
      )
    );
    setEditingId(null);
  };

  return (
    <Card>
      <SectionTitle>Đánh Dấu Sản Phẩm &quot;Đặt Trước&quot;</SectionTitle>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        Bật cho sản phẩm chưa có sẵn hàng — người mua vẫn thanh toán trước (tiền vào ký quỹ, KHÔNG
        đưa cho bạn ngay). Bắt buộc cam kết thời gian giao + thời gian bảo hành. Giao trễ hạn hệ
        thống sẽ TỰ ĐỘNG hoàn tiền cho người mua.
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">Đang tải...</p>
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="Chưa có sản phẩm">Bạn chưa có sản phẩm nào để đánh dấu đặt trước.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const on = p.preOrder;
            const isEditing = editingId === p.id;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-border-c bg-surface px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-alt text-muted">
                      <Package className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted">
                        {p.categoryLabel}
                        {on && p.preOrderDeliveryValue && (
                          <>
                            {" · "}Giao trong {p.preOrderDeliveryValue}{" "}
                            {p.preOrderDeliveryUnit === "hour" ? "giờ" : "ngày"} · Bảo hành{" "}
                            {p.warrantyValue} {p.warrantyUnit === "hour" ? "giờ" : "ngày"}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {on && (
                      <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                        Sửa
                      </Button>
                    )}
                    <button
                      onClick={() => (on ? handleTurnOff(p.id) : openEdit(p))}
                      disabled={busyId === p.id}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                        on ? "bg-brand text-ink" : "bg-surface-alt text-muted hover:bg-border-c"
                      }`}
                    >
                      {busyId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {on ? "Đang đặt trước" : "Đánh dấu đặt trước"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="rounded-lg border border-dashed border-border-c bg-surface-alt/50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">
                        {on ? "Sửa cấu hình đặt trước" : "Bật đặt trước — bắt buộc cam kết"}
                      </p>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-muted hover:text-foreground"
                        aria-label="Đóng"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Thời gian giao hàng" hint="Quá hạn chưa giao sẽ tự động hoàn tiền cho buyer.">
                        <div className="flex gap-2">
                          <TextInput
                            type="number"
                            min={1}
                            value={deliveryValue}
                            onChange={(e) => setDeliveryValue(e.target.value)}
                            className="w-20"
                          />
                          <Select
                            value={deliveryUnit}
                            onChange={(e) => setDeliveryUnit(e.target.value as UnitOption)}
                          >
                            <option value="day">Ngày</option>
                            <option value="hour">Giờ</option>
                          </Select>
                        </div>
                      </Field>
                      <Field label="Thời gian bảo hành" hint="Bắt buộc > 0 — đặt trước không cho phép bán đứt.">
                        <div className="flex gap-2">
                          <TextInput
                            type="number"
                            min={1}
                            value={warrantyValue}
                            onChange={(e) => setWarrantyValue(e.target.value)}
                            className="w-20"
                          />
                          <Select
                            value={warrantyUnit}
                            onChange={(e) => setWarrantyUnit(e.target.value as UnitOption)}
                          >
                            <option value="day">Ngày</option>
                            <option value="hour">Giờ</option>
                          </Select>
                        </div>
                      </Field>
                    </div>
                    {error && (
                      <p className="mt-2 text-xs font-semibold text-danger">{error}</p>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                        Huỷ
                      </Button>
                      <Button size="sm" disabled={busyId === p.id} onClick={() => handleSave(p.id)}>
                        {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Lưu & Bật đặt trước
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
