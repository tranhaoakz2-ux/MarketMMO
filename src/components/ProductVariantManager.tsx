"use client";

import { LogIn, Package, Plus, Store, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { PRODUCT_STATUS_LABEL, type ProductStatus } from "@/lib/constants";
import type { Product } from "@/data/products";

const STATUS_STYLE: Record<ProductStatus, string> = {
  PENDING: "bg-brand-light text-brand-dark",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

function AddVariantForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/seller/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, price: Number(price), stock: Number(stock) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể thêm biến thể.");
      return;
    }
    setLabel("");
    setPrice("");
    setStock("");
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2 rounded-lg border border-dashed border-brand-dark/40 bg-brand-light/15 p-3 sm:grid-cols-[1fr_140px_100px_auto]"
    >
      <input
        type="text"
        required
        minLength={3}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Tên biến thể (VD: Domain .US - Thuê 24h - Tên Việt)"
        className="rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
      />
      <input
        type="number"
        required
        min={1000}
        step={1000}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Giá (đ)"
        className="rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
      />
      <input
        type="number"
        required
        min={0}
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        placeholder="Kho"
        className="rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" /> Thêm
      </button>
      {error && (
        <p className="sm:col-span-4 text-xs font-semibold text-danger">{error}</p>
      )}
    </form>
  );
}

function ProductCard({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (variantId: string) => {
    if (!confirm("Xoá biến thể này? Đơn hàng cũ vẫn giữ nguyên thông tin.")) return;
    setBusyId(variantId);
    await fetch(`/api/seller/products/${product.id}/variants/${variantId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    onChanged();
  };

  const variants = product.variants ?? [];
  const status = product.status ?? "APPROVED";

  return (
    <div className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {status === "APPROVED" ? (
              <Link
                href={`/san-pham/${product.slug}`}
                className="font-bold text-ink hover:text-brand-dark"
              >
                {product.name}
              </Link>
            ) : (
              <span className="font-bold text-ink">{product.name}</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}>
              {PRODUCT_STATUS_LABEL[status]}
            </span>
          </div>
          {status === "REJECTED" && product.adminNote && (
            <p className="mt-1 text-xs font-semibold text-danger">
              Lý do từ chối: {product.adminNote}
            </p>
          )}
          <p className="text-xs text-muted">
            Giá mặc định: {formatVnd(product.price)} · Kho mặc định: {product.stock}
          </p>
        </div>
        <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-bold text-ink">
          {variants.length} biến thể
        </span>
      </div>

      {variants.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">{v.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-danger">{formatVnd(v.price)}</span>
                <span className="text-xs text-muted">Kho: {v.stock}</span>
                <span className="text-xs text-muted">Đã bán: {v.sold}</span>
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={busyId === v.id}
                  className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  aria-label="Xoá biến thể"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <AddVariantForm productId={product.id} onCreated={onChanged} />
      </div>
    </div>
  );
}

export default function ProductVariantManager() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/seller/products");
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) load();
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">
          Bạn cần đăng nhập để quản lý sản phẩm/biến thể.
        </p>
        <Link
          href="/dang-nhap?callbackUrl=/quan-ly-san-pham"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">
          Bạn cần đăng ký bán hàng trước khi quản lý sản phẩm/biến thể.
        </p>
        <Link
          href="/tro-thanh-nguoi-ban"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          <Store className="h-4 w-4" /> Đăng ký bán hàng
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Đang tải...</p>;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
        <Package className="h-8 w-8 text-muted" />
        Gian hàng của bạn chưa có sản phẩm nào để thêm biến thể.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onChanged={load} />
      ))}
    </div>
  );
}
