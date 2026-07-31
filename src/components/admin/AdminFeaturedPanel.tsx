"use client";

// Màn quản lý "Nổi bật trang chủ" — 2 danh sách độc lập (Sản phẩm / Seller
// đang được admin ghim), kéo-thả sắp lại thứ tự bằng HTML5 drag-and-drop có
// sẵn của trình duyệt (không thêm thư viện). Ghim/bỏ ghim MỚI vẫn thực hiện
// từ màn quản lý sản phẩm/seller (AdminAllProductsPanel/AdminSellersPanel)
// — màn này chỉ sắp thứ tự + bỏ ghim nhanh cho các mục ĐÃ ghim.
import { AlertTriangle, EyeOff, GripVertical, Package, Store, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, EmptyState, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";
import SellerAvatar from "@/components/SellerAvatar";

type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  sellerName: string;
  visible: boolean;
  featuredOrder: number | null;
};

type FeaturedSeller = {
  id: string;
  slug: string;
  shopName: string;
  avatarUrl: string | null;
  level: number;
  visible: boolean;
  featuredOrder: number | null;
};

function DraggableList<T extends { id: string; visible: boolean }>({
  items,
  onReorder,
  onRemove,
  renderItem,
  busyId,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  onRemove: (item: T) => void;
  renderItem: (item: T) => ReactNode;
  busyId: string | null;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setDragIndex(null);
    onReorder(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-center gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3 transition ${
            dragIndex === i ? "opacity-40" : ""
          }`}
        >
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--adm-muted)]" />
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--adm-brand-dim)] text-[11px] font-black text-[var(--adm-brand)]">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">{renderItem(item)}</div>
          {!item.visible && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--adm-warn-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--adm-warn)]">
              <EyeOff className="h-3 w-3" /> Chưa hiện công khai
            </span>
          )}
          <Button size="sm" variant="danger" disabled={busyId === item.id} onClick={() => onRemove(item)}>
            <X className="h-3.5 w-3.5" /> Bỏ ghim
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function AdminFeaturedPanel() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [sellers, setSellers] = useState<FeaturedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      fetch("/api/admin/featured/products"),
      fetch("/api/admin/featured/sellers"),
    ]);
    if (pRes.ok) setProducts((await pRes.json()).products);
    if (sRes.ok) setSellers((await sRes.json()).sellers);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, []);

  const reorderProducts = async (next: FeaturedProduct[]) => {
    setProducts(next); // optimistic
    setError(null);
    const res = await fetch("/api/admin/featured/products/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể lưu thứ tự sản phẩm.");
      loadAll();
    }
  };

  const reorderSellers = async (next: FeaturedSeller[]) => {
    setSellers(next); // optimistic
    setError(null);
    const res = await fetch("/api/admin/featured/sellers/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((s) => s.id) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể lưu thứ tự seller.");
      loadAll();
    }
  };

  const unpinProduct = async (p: FeaturedProduct) => {
    setBusyId(p.id);
    setError(null);
    const res = await fetch(`/api/admin/all-products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: false }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Không thể bỏ ghim sản phẩm.");
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  const unpinSeller = async (s: FeaturedSeller) => {
    setBusyId(s.id);
    setError(null);
    const res = await fetch(`/api/admin/sellers/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unfeature" }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Không thể bỏ ghim seller.");
      return;
    }
    setSellers((prev) => prev.filter((x) => x.id !== s.id));
  };

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <div>
        <h2 className="mb-1 text-sm font-black text-[var(--adm-text)]">Sản phẩm nổi bật ({products.length})</h2>
        <p className="mb-3 text-xs text-[var(--adm-muted)]">
          Kéo-thả để sắp thứ tự — mục đứng trên hiện trước trên trang chủ. Ghim thêm sản phẩm mới tại{" "}
          <span className="font-semibold text-[var(--adm-text)]">Kiểm duyệt &gt; Sản phẩm</span>.
        </p>
        {products.length === 0 ? (
          <Card>
            <EmptyState icon={Package} title="Chưa ghim sản phẩm nào">
              Trang chủ đang tự động điền bằng sản phẩm nổi bật/bán chạy.
            </EmptyState>
          </Card>
        ) : (
          <DraggableList
            items={products}
            onReorder={reorderProducts}
            onRemove={unpinProduct}
            busyId={busyId}
            renderItem={(p) => (
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--adm-surface)]">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--adm-text)]">{p.name}</p>
                  <p className="truncate text-xs text-[var(--adm-muted)]">
                    {p.sellerName} · {formatVndDemo(p.price)}
                  </p>
                </div>
              </div>
            )}
          />
        )}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-black text-[var(--adm-text)]">Seller nổi bật ({sellers.length})</h2>
        <p className="mb-3 text-xs text-[var(--adm-muted)]">
          Kéo-thả để sắp thứ tự. Ghim thêm seller mới tại{" "}
          <span className="font-semibold text-[var(--adm-text)]">Vận hành &gt; Người bán</span>.
        </p>
        {sellers.length === 0 ? (
          <Card>
            <EmptyState icon={Store} title="Chưa ghim seller nào">
              Trang chủ đang tự động điền bằng seller đánh giá cao/nhiều sản phẩm.
            </EmptyState>
          </Card>
        ) : (
          <DraggableList
            items={sellers}
            onReorder={reorderSellers}
            onRemove={unpinSeller}
            busyId={busyId}
            renderItem={(s) => (
              <div className="flex items-center gap-3">
                <SellerAvatar avatarUrl={s.avatarUrl} shopName={s.shopName} size={40} shape="square" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--adm-text)]">{s.shopName}</p>
                  <p className="truncate text-xs text-[var(--adm-muted)]">Level {s.level}</p>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
