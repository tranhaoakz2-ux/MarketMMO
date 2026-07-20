"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";

type PendingProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  categoryName: string;
  seller: { shopName: string; slug: string };
};

export default function AdminProductsPanel() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/products");
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

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/products/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = products.filter((p) => p.status === "PENDING");

  return (
    <div>
      <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Sản phẩm chờ duyệt ({pending.length})</h2>
      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : pending.length === 0 ? (
        <AdminEmptyState>Không có sản phẩm nào đang chờ duyệt.</AdminEmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((p) => (
            <AdminCard key={p.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh Blob/local công khai, xem nhanh trong bảng admin không cần next/image tối ưu
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[var(--adm-border)]"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-[var(--adm-surface-2)] ring-1 ring-[var(--adm-border)]" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--adm-text)]">{p.name}</p>
                <p className="text-xs text-[var(--adm-muted)]">
                  {p.seller.shopName} · {p.categoryName} · {formatVnd(p.price)} · Kho {p.stock} ·{" "}
                  {new Date(p.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 text-xs text-[var(--adm-text)]/70">{p.shortDescription}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <AdminButton variant="success" disabled={busyId === p.id} onClick={() => handleAction(p.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </AdminButton>
                <AdminButton variant="danger" disabled={busyId === p.id} onClick={() => handleAction(p.id, "reject")}>
                  <X className="h-3.5 w-3.5" /> Từ chối
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
