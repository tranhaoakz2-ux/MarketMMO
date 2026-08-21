"use client";

// Panel quản trị CÂY danh mục (Giai đoạn 2 — tính năng cây danh mục động,
// xem PROJECT_MAP.md) — tạo/sửa/xoá/sắp xếp/ẩn-hiện nhóm cha & danh mục con
// qua UI, để admin tự mở rộng cây KHÔNG cần gõ SQL tay. Tách biệt hoàn toàn
// khỏi AdminCategoriesPanel (chỉ xử lý luồng duyệt category do seller đề
// xuất) — 2 panel độc lập, cùng hiện trên /admin/danh-muc.
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
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
  TextInput,
} from "@/components/admin-demo/AdminDemoKit";

type FlatCategory = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  status: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  childCount: number;
};

type TreeNode = FlatCategory & { children: TreeNode[] };

function buildTree(flat: FlatCategory[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: TreeNode[] = [];
  flat.forEach((c) => {
    const node = byId.get(c.id)!;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

// Tập id CHÍNH NÓ + mọi con cháu — dùng để loại khỏi dropdown "Nhóm cha" khi
// sửa (chặn tự chọn con của chính mình làm cha, tạo vòng lặp). Server cũng
// tự kiểm tra lại (không tin riêng validate phía client).
function selfAndDescendantIds(flat: FlatCategory[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of flat) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

type FormState = {
  mode: "create" | "edit";
  id?: string;
  name: string;
  parentId: string; // "" = không có cha (nhóm gốc)
  sortOrder: string;
};

export default function AdminCategoryTreePanel() {
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/category-tree");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId: string | null) => {
    setFormError(null);
    setForm({ mode: "create", name: "", parentId: parentId ?? "", sortOrder: "0" });
  };

  const openEdit = (c: FlatCategory) => {
    setFormError(null);
    setForm({
      mode: "edit",
      id: c.id,
      name: c.name,
      parentId: c.parentId ?? "",
      sortOrder: String(c.sortOrder),
    });
  };

  const closeForm = () => {
    setForm(null);
    setFormError(null);
  };

  const submitForm = async () => {
    if (!form) return;
    const name = form.name.trim();
    const sortOrder = Number.parseInt(form.sortOrder, 10) || 0;
    if (name.length < 2) {
      setFormError("Tên phải từ 2 ký tự trở lên.");
      return;
    }

    setFormBusy(true);
    setFormError(null);
    const payload = { name, parentId: form.parentId || null, sortOrder };
    const res = await fetch(
      form.mode === "create" ? "/api/admin/category-tree" : `/api/admin/category-tree/${form.id}`,
      {
        method: form.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => null);
    setFormBusy(false);
    if (!res.ok) {
      setFormError(data?.error ?? "Có lỗi xảy ra.");
      return;
    }
    closeForm();
    load();
  };

  const toggleActive = async (c: FlatCategory) => {
    setBusyId(c.id);
    setRowError(null);
    const res = await fetch(`/api/admin/category-tree/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRowError({ id: c.id, message: data?.error ?? "Không thể cập nhật." });
      return;
    }
    load();
  };

  const handleDelete = async (c: FlatCategory) => {
    if (!confirm(`Xoá danh mục "${c.name}"? Hành động này không thể hoàn tác.`)) return;
    setBusyId(c.id);
    setRowError(null);
    const res = await fetch(`/api/admin/category-tree/${c.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRowError({ id: c.id, message: data?.error ?? "Không thể xoá." });
      return;
    }
    load();
  };

  // Đổi thứ tự trong CÙNG 1 nhóm cha (parentId===null cũng tính là 1 nhóm) —
  // KHÔNG bao giờ cho nhảy sang nhóm cha khác. `categories` đã sort sẵn theo
  // [sortOrder asc, name asc] từ API nên lọc theo đúng parentId là ra ĐÚNG
  // thứ tự hiển thị hiện tại của nhóm đó, không cần sort lại.
  //
  // Đánh số lại TOÀN BỘ nhóm anh em thành 0,1,2... sau khi hoán đổi (thay vì
  // chỉ swap 2 giá trị sortOrder cho nhau) — nhiều danh mục cũ đang cùng
  // sortOrder=0 (giá trị mặc định), swap trực tiếp 2 số bằng nhau sẽ KHÔNG
  // tạo ra thay đổi thứ tự nào cả. Đánh số lại đảm bảo luôn di chuyển được.
  const moveCategory = async (node: FlatCategory, direction: "up" | "down") => {
    const siblings = categories.filter((c) => c.parentId === node.parentId);
    const index = siblings.findIndex((c) => c.id === node.id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

    setBusyId(node.id);
    setRowError(null);
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].sortOrder === i) continue;
        const res = await fetch(`/api/admin/category-tree/${reordered[i].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setRowError({ id: node.id, message: data?.error ?? "Không thể đổi thứ tự." });
          break;
        }
      }
    } finally {
      setBusyId(null);
      load();
    }
  };

  const tree = buildTree(categories);
  const excludedForParentSelect = form?.mode === "edit" && form.id
    ? selfAndDescendantIds(categories, form.id)
    : new Set<string>();
  const parentOptions = categories
    .filter((c) => !excludedForParentSelect.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  function renderNode(node: TreeNode, depth: number) {
    const isCollapsed = collapsed.has(node.id);
    const hasChildren = node.children.length > 0;
    // Vị trí trong đúng nhóm anh em (cùng parentId) — quyết định ẩn/vô hiệu
    // nút lên/xuống ở 2 đầu danh sách. KHÔNG dùng node.children (đó là con
    // CỦA node này, không phải anh em của node).
    const siblings = categories.filter((c) => c.parentId === node.parentId);
    const siblingIndex = siblings.findIndex((c) => c.id === node.id);
    const isFirstSibling = siblingIndex <= 0;
    const isLastSibling = siblingIndex === siblings.length - 1;
    return (
      <div key={node.id}>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[var(--adm-border)] py-2.5 last:border-0"
          style={depth > 0 ? { paddingLeft: depth * 22 } : undefined}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              className="shrink-0 text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">
            <span className={`text-sm ${hasChildren ? "font-black" : "font-semibold"} text-[var(--adm-text)]`}>
              {node.name}
            </span>
            <span className="ml-2 text-[11px] text-[var(--adm-muted)]">/{node.slug}</span>
            {!node.isActive && (
              <span className="ml-2 rounded-full bg-[var(--adm-warn-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--adm-warn)]">
                Đã ẩn
              </span>
            )}
            {node.status !== "APPROVED" && (
              <span className="ml-2 rounded-full bg-[var(--adm-info-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--adm-info)]">
                {node.status}
              </span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--adm-muted)]">
            {node.childCount > 0 && `${node.childCount} con · `}
            {node.productCount} sản phẩm
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {!isFirstSibling && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === node.id}
                onClick={() => moveCategory(node, "up")}
                aria-label="Di chuyển lên"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isLastSibling && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === node.id}
                onClick={() => moveCategory(node, "down")}
                aria-label="Di chuyển xuống"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openCreate(node.id)}>
              <Plus className="h-3.5 w-3.5" /> Con
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busyId === node.id}
              onClick={() => toggleActive(node)}
            >
              {node.isActive ? "Ẩn" : "Hiện"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busyId === node.id}
              onClick={() => handleDelete(node)}
            >
              {busyId === node.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {rowError?.id === node.id && (
          <p className="flex items-center gap-1.5 pb-2 pl-8 text-xs font-semibold text-[var(--adm-danger)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {rowError.message}
          </p>
        )}
        {hasChildren && !isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[var(--adm-muted)]">
          {loading ? "Đang tải..." : `${categories.length} danh mục (mọi trạng thái)`}
        </p>
        <Button size="sm" onClick={() => openCreate(null)}>
          <Plus className="h-3.5 w-3.5" /> Thêm nhóm cha mới
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : tree.length === 0 ? (
        <Card>
          <EmptyState icon={FolderTree} title="Chưa có danh mục nào">
            Bấm &quot;Thêm nhóm cha mới&quot; để bắt đầu dựng cây danh mục.
          </EmptyState>
        </Card>
      ) : (
        <Card padding="p-4">{tree.map((node) => renderNode(node, 0))}</Card>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeForm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-black text-[var(--adm-text)]">
                {form.mode === "create" ? "Thêm danh mục mới" : "Sửa danh mục"}
              </h3>
              <button onClick={closeForm} className="text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Field label="Tên danh mục">
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={60}
                  autoFocus
                />
              </Field>
              <Field label="Nhóm cha" hint="Để trống = nhóm gốc (hiện thẳng ở cấp cao nhất trong sidebar).">
                <Select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                >
                  <option value="">— Không có (nhóm gốc) —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn hiện trước, trong cùng 1 nhóm cha.">
                <TextInput
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </Field>

              {formError && (
                <p className="flex items-center gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {formError}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button variant="secondary" onClick={closeForm}>
                  Huỷ
                </Button>
                <Button disabled={formBusy} onClick={submitForm}>
                  {formBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {form.mode === "create" ? "Tạo danh mục" : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
