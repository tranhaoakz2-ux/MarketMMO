"use client";

// Panel THẬT "Sản phẩm chờ duyệt" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoProducts.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT: fetch GET /api/admin/products, POST /api/admin/products/[id]
// {action:"approve"|"reject"} — không đổi 1 dòng logic nghiệp vụ. API route
// đã có sẵn requireAdmin() (không đụng tới).
import { Check, PackageSearch, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ListSkeleton, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";

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
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-[var(--adm-muted)]">
        {loading ? "Đang tải..." : `${pending.length} sản phẩm đang chờ duyệt`}
      </p>

      {loading ? (
        <ListSkeleton />
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState icon={PackageSearch} title="Không có sản phẩm nào đang chờ duyệt">
            Mọi sản phẩm mới đã được xử lý hết. 🎉
          </EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh Blob/local công khai, xem nhanh trong bảng admin không cần next/image tối ưu
                <img src={p.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[var(--adm-border)]" />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--adm-surface-2)] text-[var(--adm-muted)] ring-1 ring-[var(--adm-border)]">
                  <PackageSearch className="h-6 w-6" strokeWidth={1.6} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--adm-text)]">{p.name}</p>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
                  {p.seller.shopName} · {p.categoryName} · {formatVndDemo(p.price)} · Kho {p.stock} ·{" "}
                  {new Date(p.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 text-xs text-[var(--adm-text)]/70">{p.shortDescription}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="success" disabled={busyId === p.id} onClick={() => handleAction(p.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </Button>
                <Button variant="danger" disabled={busyId === p.id} onClick={() => handleAction(p.id, "reject")}>
                  <X className="h-3.5 w-3.5" /> Từ chối
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
