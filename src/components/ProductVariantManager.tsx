"use client";

import { Database, Layers, LogIn, Package, Plus, Store, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { PRODUCT_STATUS_LABEL, type ProductStatus } from "@/lib/constants";
import type { Product } from "@/data/products";
import {
  Card,
  Column,
  DataTable,
  EmptyState,
  FilterBar,
  SearchInput,
  SectionTitle,
  Segmented,
  StatusBadge,
  Tone,
} from "@/components/seller-demo/DemoKit";

const FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
];

// Seller nhập hàng loạt dữ liệu giao hàng thật (kho — xem model
// ProductStockItem trong prisma/schema.prisma) cho 1 sản phẩm (chưa có
// variant) hoặc 1 phiên bản cụ thể. Mỗi dòng textarea = 1 đơn vị sẽ giao TỰ
// ĐỘNG cho đúng 1 khách khi mua (POST /api/checkout tự "claim").
function StockEntryPanel({
  productId,
  variantId,
  stockManaged,
  stockAvailable,
  onAdded,
}: {
  productId: string;
  variantId?: string;
  stockManaged?: boolean;
  stockAvailable?: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lineCount = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/seller/products/${productId}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, items: text }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể nhập kho.");
      return;
    }
    setText("");
    setOpen(false);
    onAdded();
  };

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {stockManaged ? (
          <span className="flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-bold text-info">
            <Database className="h-3 w-3" /> Kho thật: {stockAvailable ?? 0} còn hàng
          </span>
        ) : (
          <span className="text-[11px] text-muted">Chưa nhập kho dữ liệu giao hàng thật</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-bold text-brand-dark hover:underline"
        >
          {open ? "Đóng" : "Nhập kho"}
        </button>
      </div>

      {open && (
        <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg border border-dashed border-brand-dark/40 bg-brand-light/10 p-2.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              "Mỗi dòng là 1 sản phẩm sẽ giao cho khách, ví dụ:\nemail1@gmail.com|MatKhau123|MaKhoiPhuc\nemail2@gmail.com|MatKhau456|MaKhoiPhuc"
            }
            className="w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">{lineCount} dòng hợp lệ</span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || lineCount === 0}
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Đang lưu..." : "Thêm vào kho"}
            </button>
          </div>
          {error && <p className="text-[11px] font-semibold text-danger">{error}</p>}
          <p className="text-[11px] leading-relaxed text-foreground/70">
            Mỗi dòng sẽ được giao TỰ ĐỘNG cho đúng 1 khách khi mua — hệ thống tự gán theo thứ tự,
            không giao trùng. Từ lúc này, &ldquo;Kho&rdquo; tự động đồng bộ theo số lượng còn lại
            trong kho thật.
          </p>
        </div>
      )}
    </div>
  );
}

function AddVariantForm({ productId, onCreated }: { productId: string; onCreated: () => void }) {
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
      setError(data.error ?? "Không thể thêm phiên bản.");
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
        placeholder="Tên phiên bản (VD: Domain .US - Thuê 24h - Tên Việt)"
        className="rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
      />
      <input
        type="number"
        required
        min={1000}
        step={1000}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Giá (đ)"
        className="rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
      />
      <input
        type="number"
        required
        min={0}
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        placeholder="Kho"
        className="rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" /> Thêm
      </button>
      {error && <p className="sm:col-span-4 text-xs font-semibold text-danger">{error}</p>}
    </form>
  );
}

const STATUS_TONE: Record<ProductStatus, Tone> = {
  PENDING: "warn",
  APPROVED: "success",
  REJECTED: "danger",
};

function StockCell({ p }: { p: Product }) {
  if (p.stockManaged) {
    const low = (p.stockAvailable ?? 0) < 3;
    return (
      <StatusBadge tone={low ? "warn" : "info"} dot>
        Kho thật: {p.stockAvailable ?? 0}
      </StatusBadge>
    );
  }
  return <span className="tabular-nums text-foreground">{p.stock}</span>;
}

// Modal quản lý phiên bản + kho của 1 sản phẩm (mở từ nút icon trong bảng) —
// giữ nguyên toàn bộ chức năng cũ: thêm/xoá phiên bản, nhập kho theo sản phẩm
// gốc hoặc từng phiên bản.
function ManageModal({
  product,
  onClose,
  onChanged,
}: {
  product: Product;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const variants = product.variants ?? [];
  const status = (product.status ?? "APPROVED") as ProductStatus;

  const handleDelete = async (variantId: string) => {
    if (!confirm("Xoá phiên bản này? Đơn hàng cũ vẫn giữ nguyên thông tin.")) return;
    setBusyId(variantId);
    await fetch(`/api/seller/products/${product.id}/variants/${variantId}`, { method: "DELETE" });
    setBusyId(null);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-c bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-foreground">{product.name}</h3>
              <StatusBadge tone={STATUS_TONE[status]} dot>
                {PRODUCT_STATUS_LABEL[status]}
              </StatusBadge>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Giá mặc định: {formatVnd(product.price)} · Kho mặc định: {product.stock}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "REJECTED" && product.adminNote && (
          <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
            Lý do từ chối: {product.adminNote}
          </p>
        )}

        {/* Không có phiên bản: nhập kho ở cấp sản phẩm gốc */}
        {variants.length === 0 && (
          <div className="rounded-xl border border-border-c bg-surface-alt p-3">
            <p className="text-sm font-bold text-foreground">Kho sản phẩm</p>
            <StockEntryPanel
              productId={product.id}
              stockManaged={product.stockManaged}
              stockAvailable={product.stockAvailable}
              onAdded={onChanged}
            />
          </div>
        )}

        {/* Có phiên bản: từng phiên bản có kho riêng */}
        {variants.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionTitle aside={<span className="text-[11px] text-muted">{variants.length} phiên bản</span>}>
              Phiên bản
            </SectionTitle>
            {variants.map((v) => (
              <div key={v.id} className="rounded-lg border border-border-c bg-surface-alt px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{v.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-danger">{formatVnd(v.price)}</span>
                    <span className="text-xs text-muted">Kho: {v.stock}</span>
                    <span className="text-xs text-muted">Đã bán: {v.sold}</span>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={busyId === v.id}
                      className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      aria-label="Xoá phiên bản"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <StockEntryPanel
                  productId={product.id}
                  variantId={v.id}
                  stockManaged={v.stockManaged}
                  stockAvailable={v.stockAvailable}
                  onAdded={onChanged}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold text-foreground">Thêm phiên bản mới</p>
          <AddVariantForm productId={product.id} onCreated={onChanged} />
        </div>
      </div>
    </div>
  );
}

export default function ProductVariantManager() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
    if (!session) return;
    (async () => {
      await load();
    })();
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">Bạn cần đăng nhập để quản lý sản phẩm/phiên bản.</p>
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
        <p className="text-sm text-muted">Bạn cần đăng ký bán hàng trước khi quản lý sản phẩm/phiên bản.</p>
        <Link
          href="/tro-thanh-nguoi-ban"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          <Store className="h-4 w-4" /> Đăng ký bán hàng
        </Link>
      </div>
    );
  }

  const filtered = products.filter(
    (p) =>
      (statusFilter === "ALL" || (p.status ?? "APPROVED") === statusFilter) &&
      p.name.toLowerCase().includes(q.toLowerCase())
  );
  const rejectedWithNote = filtered.filter((p) => p.status === "REJECTED" && p.adminNote);
  const active = products.find((p) => p.id === activeId) ?? null;

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Sản phẩm",
      primary: true,
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-alt text-muted">
            <Package className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            {p.status === "APPROVED" ? (
              <Link
                href={`/san-pham/${p.slug}`}
                className="block max-w-[300px] truncate font-semibold text-foreground hover:text-brand-dark"
              >
                {p.name}
              </Link>
            ) : (
              <p className="max-w-[300px] truncate font-semibold text-foreground">{p.name}</p>
            )}
            <p className="text-[11px] text-muted">
              {p.categoryLabel}
              {(p.variants?.length ?? 0) > 0 ? ` · ${p.variants!.length} phiên bản` : ""}
              {p.preOrder ? " · Đặt trước" : ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "price", header: "Giá", align: "right", render: (p) => <span className="whitespace-nowrap font-bold tabular-nums text-danger">{formatVnd(p.price)}</span> },
    { key: "stock", header: "Kho", align: "right", render: (p) => <StockCell p={p} /> },
    { key: "sold", header: "Đã bán", align: "right", render: (p) => <span className="tabular-nums text-muted">{p.sold}</span> },
    {
      key: "status",
      header: "Trạng thái",
      render: (p) => (
        <StatusBadge tone={STATUS_TONE[(p.status ?? "APPROVED") as ProductStatus]} dot>
          {PRODUCT_STATUS_LABEL[(p.status ?? "APPROVED") as ProductStatus]}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <button
            title="Nhập kho dữ liệu giao hàng"
            onClick={() => setActiveId(p.id)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:border-brand-dark hover:text-brand-dark"
          >
            <Database className="h-4 w-4" />
          </button>
          <button
            title="Thêm / sửa phiên bản"
            onClick={() => setActiveId(p.id)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:border-brand-dark hover:text-brand-dark"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <div className="mb-4">
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên sản phẩm..." />
          <Segmented value={statusFilter} onChange={setStatusFilter} options={FILTERS} />
        </FilterBar>
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">Đang tải...</p>
      ) : (
        <>
          {rejectedWithNote.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {rejectedWithNote.map((p) => (
                <div key={p.id} className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger">
                  <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <b>{p.name}</b> bị từ chối: {p.adminNote}
                  </span>
                </div>
              ))}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            empty={
              <EmptyState icon={Package} title="Chưa có sản phẩm">
                Bấm &quot;Đăng sản phẩm mới&quot; ở trên để bắt đầu bán.
              </EmptyState>
            }
          />
        </>
      )}

      {active && <ManageModal product={active} onClose={() => setActiveId(null)} onChanged={load} />}
    </Card>
  );
}
