"use client";

import { Clock, Info, Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, SectionTitle } from "@/components/seller-demo/DemoKit";
import type { Product } from "@/data/products";

export default function SellerPreOrderPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handleToggle = async (productId: string, next: boolean) => {
    setBusyId(productId);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, preOrder: next } : p)));
    const res = await fetch(`/api/seller/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preOrder: next }),
    });
    if (!res.ok) {
      // rollback nếu API lỗi
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, preOrder: !next } : p)));
    }
    setBusyId(null);
  };

  return (
    <Card>
      <SectionTitle>Đánh dấu sản phẩm &quot;Đặt trước&quot;</SectionTitle>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        Bật cho sản phẩm chưa có sẵn hàng — người mua vẫn thanh toán trước (tiền vào ký quỹ như
        đơn thường), hệ thống bỏ qua kiểm tra tồn kho.
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">Đang tải...</p>
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="Chưa có sản phẩm">Bạn chưa có sản phẩm nào để đánh dấu đặt trước.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const on = p.preOrder;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-c bg-surface px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-alt text-muted">
                    <Package className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted">{p.categoryLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(p.id, !on)}
                  disabled={busyId === p.id}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                    on ? "bg-brand text-ink" : "bg-surface-alt text-muted hover:bg-border-c"
                  }`}
                >
                  {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                  {on ? "Đang đặt trước" : "Đánh dấu đặt trước"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
