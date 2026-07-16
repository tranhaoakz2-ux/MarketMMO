"use client";

import { Clock, Loader2, PackageX } from "lucide-react";
import { useEffect, useState } from "react";
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
    load();
  }, []);

  const handleToggle = async (productId: string, next: boolean) => {
    setBusyId(productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, preOrder: next } : p))
    );
    const res = await fetch(`/api/seller/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preOrder: next }),
    });
    if (!res.ok) {
      // rollback nếu API lỗi
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, preOrder: !next } : p))
      );
    }
    setBusyId(null);
  };

  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-ink">Đánh dấu sản phẩm &quot;Đặt trước&quot;</h2>
      <p className="mb-4 text-xs text-muted">
        Bật cho sản phẩm chưa có sẵn hàng — người mua vẫn thanh toán trước bình thường (tiền
        vào ký quỹ như đơn thường), hệ thống bỏ qua kiểm tra tồn kho cho sản phẩm này.
      </p>

      {loading ? (
        <p className="text-sm text-muted">Đang tải...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-c p-8 text-center text-sm text-muted">
          <PackageX className="h-6 w-6" />
          Bạn chưa có sản phẩm nào.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-c px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-muted">{p.categoryLabel}</p>
              </div>
              <button
                onClick={() => handleToggle(p.id, !p.preOrder)}
                disabled={busyId === p.id}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                  p.preOrder
                    ? "bg-brand text-ink"
                    : "bg-surface-alt text-muted hover:bg-border-c"
                }`}
              >
                {busyId === p.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {p.preOrder ? "Đang đặt trước" : "Đánh dấu đặt trước"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
