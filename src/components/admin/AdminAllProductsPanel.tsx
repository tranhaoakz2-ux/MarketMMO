"use client";

// Panel quản trị TOÀN BỘ sản phẩm đang sống trên sàn (sửa/ẩn/xoá) — KHÁC
// AdminProductsPanel.tsx (chỉ xử lý luồng duyệt PENDING/REJECTED khi seller
// đăng sản phẩm mới). 2 panel độc lập, cùng hiện trên /admin/san-pham.
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  ListSkeleton,
  Select,
  StatusBadge,
  Textarea,
  TextInput,
  type Tone,
} from "@/components/admin-demo/AdminDemoKit";
import { formatVnd } from "@/lib/format";

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string[];
  price: number;
  priceMax: number | null;
  stock: number;
  sold: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  productType: "PRODUCT" | "SERVICE";
  hot: boolean;
  preOrder: boolean;
  categoryId: string;
  categoryName: string;
  sellerName: string;
  sellerSlug: string;
  orderCount: number;
  bidCount: number;
  createdAt: string;
};

type LeafCategory = { id: string; slug: string; name: string; emoji: string };
type CategoryTreeApiNode = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  status: string;
  childCount: number;
  parentId: string | null;
};

const STATUS_TONE: Record<AdminProduct["status"], Tone> = {
  PENDING: "warn",
  APPROVED: "success",
  REJECTED: "danger",
};

type FormState = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  price: string;
  priceMax: string;
  stock: string;
  categoryId: string;
};

// GET /api/admin/category-tree trả danh sách PHẲNG kèm childCount (tái
// dùng nguyên từ tính năng cây danh mục, không viết lại logic cây lần 2) —
// category LÁ = childCount === 0, đúng danh mục hợp lệ để gán cho sản phẩm
// (nhóm cha không bao giờ được chọn làm categoryId, xem PATCH route).
function leafCategoriesFrom(nodes: CategoryTreeApiNode[]): LeafCategory[] {
  return nodes
    .filter((n) => n.childCount === 0 && n.status !== "REJECTED")
    .map((n) => ({ id: n.id, slug: n.slug, name: n.name, emoji: n.emoji }));
}

export default function AdminAllProductsPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<LeafCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const load = async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/all-products?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load("");
      const res = await fetch("/api/admin/category-tree");
      if (res.ok) {
        const data = await res.json();
        setCategories(leafCategoriesFrom(data.categories ?? []));
      }
    })();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(q);
  };

  const openEdit = (p: AdminProduct) => {
    setFormError(null);
    setForm({
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription,
      description: p.description.join("\n"),
      price: String(p.price),
      priceMax: p.priceMax !== null ? String(p.priceMax) : "",
      stock: String(p.stock),
      categoryId: p.categoryId,
    });
  };

  const closeEdit = () => {
    setForm(null);
    setFormError(null);
  };

  const submitEdit = async () => {
    if (!form) return;
    setFormBusy(true);
    setFormError(null);
    const res = await fetch(`/api/admin/all-products/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        price: Number(form.price),
        priceMax: form.priceMax.trim() === "" ? null : Number(form.priceMax),
        stock: Number(form.stock),
        categoryId: form.categoryId,
      }),
    });
    const data = await res.json().catch(() => null);
    setFormBusy(false);
    if (!res.ok) {
      setFormError(data?.error ?? "Có lỗi xảy ra.");
      return;
    }
    closeEdit();
    load(q);
  };

  const toggleActive = async (p: AdminProduct) => {
    setBusyId(p.id);
    setRowError(null);
    const res = await fetch(`/api/admin/all-products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRowError({ id: p.id, message: data?.error ?? "Không thể cập nhật." });
      return;
    }
    load(q);
  };

  const handleDelete = async (p: AdminProduct) => {
    if (!confirm(`Xoá vĩnh viễn sản phẩm "${p.name}"? Hành động này không thể hoàn tác.`)) return;
    setBusyId(p.id);
    setRowError(null);
    const res = await fetch(`/api/admin/all-products/${p.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRowError({ id: p.id, message: data?.error ?? "Không thể xoá." });
      return;
    }
    load(q);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--adm-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, slug, tên gian hàng..."
            className="w-full rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--adm-text)] placeholder:text-[var(--adm-muted)] focus:border-[var(--adm-brand)] focus:outline-none"
          />
        </div>
        <Button type="submit" size="sm">
          Tìm kiếm
        </Button>
      </form>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : products.length === 0 ? (
        <Card>
          <EmptyState icon={Package} title="Không tìm thấy sản phẩm nào">
            Thử từ khoá tìm kiếm khác.
          </EmptyState>
        </Card>
      ) : (
        <Card padding="p-0">
          <div className="flex flex-col divide-y divide-[var(--adm-border)]">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-[var(--adm-text)]">{p.name}</p>
                      <StatusBadge tone={STATUS_TONE[p.status]} dot>
                        {p.status}
                      </StatusBadge>
                      {!p.isActive && (
                        <StatusBadge tone="danger" dot>
                          Đã ẩn
                        </StatusBadge>
                      )}
                      {p.productType === "SERVICE" && <StatusBadge tone="info">Dịch vụ</StatusBadge>}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
                      {p.categoryName} · {p.sellerName} · Kho {p.stock} · Đã bán {p.sold}
                      {p.orderCount > 0 && ` · ${p.orderCount} đơn hàng`}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black tabular-nums text-[var(--adm-text)]">
                    {p.priceMax ? `${formatVnd(p.price)} - ${formatVnd(p.priceMax)}` : formatVnd(p.price)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === p.id}
                    onClick={() => toggleActive(p)}
                  >
                    {p.isActive ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Ẩn
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Hiện lại
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === p.id}
                    onClick={() => handleDelete(p)}
                  >
                    {busyId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Xoá
                  </Button>
                </div>

                {rowError?.id === p.id && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--adm-danger)]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {rowError.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-black text-[var(--adm-text)]">Sửa sản phẩm</h3>
              <button onClick={closeEdit} className="text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Field label="Tên sản phẩm">
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={150}
                />
              </Field>
              <Field label="Danh mục">
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mô tả ngắn">
                <TextInput
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  maxLength={200}
                />
              </Field>
              <Field label="Mô tả chi tiết" hint="Mỗi dòng là 1 đoạn.">
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giá (VNĐ)">
                  <TextInput
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </Field>
                <Field label="Giá cao nhất (tuỳ chọn)">
                  <TextInput
                    type="number"
                    value={form.priceMax}
                    onChange={(e) => setForm({ ...form, priceMax: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Kho">
                <TextInput
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </Field>

              {formError && (
                <p className="flex items-center gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {formError}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button variant="secondary" onClick={closeEdit}>
                  Huỷ
                </Button>
                <Button disabled={formBusy} onClick={submitEdit}>
                  {formBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
