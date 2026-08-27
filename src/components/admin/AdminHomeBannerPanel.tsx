"use client";

// Panel quản trị Banner trang chủ (model HomeBanner) — CẢ 3 vị trí
// (LARGE/SMALL_1/SMALL_2) đều dùng chung 1 khối UI (BannerSlotSection):
// danh sách kéo-thả sắp thứ tự, thêm/sửa (modal có sẵn ô chọn ảnh)/xoá slide
// tự do, không giới hạn số lượng — trước đây SMALL_1/SMALL_2 chỉ giữ đúng 1
// dòng cố định (sửa tại chỗ, không thêm/xoá được), giờ đồng nhất với LARGE.
import {
  AlertTriangle,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Field,
  ListSkeleton,
  SectionTitle,
  TextInput,
  Textarea,
} from "@/components/admin-demo/AdminDemoKit";
import { isValidCtaHref } from "@/lib/banner-link";

type Slot = "LARGE" | "SMALL_1" | "SMALL_2";

type HomeBannerRow = {
  id: string;
  slot: Slot;
  sortOrder: number;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
};

export default function AdminHomeBannerPanel() {
  const [banners, setBanners] = useState<HomeBannerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const rowUploadInputRef = useRef<HTMLInputElement>(null);
  const pendingRowUploadTarget = useRef<{ id: string; slot: Slot } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/home-banners");
    if (res.ok) {
      const data = await res.json();
      setBanners(data.banners);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/home-banners/upload-image", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải ảnh lên.");
      return null;
    }
    return data.url as string;
  };

  // Upload NHANH thay ảnh cho 1 slide ĐÃ TỒN TẠI ngay từ dòng danh sách,
  // không cần mở modal sửa (PATCH imageUrl ngay lập tức).
  const pickRowImage = (id: string, slot: Slot) => {
    pendingRowUploadTarget.current = { id, slot };
    rowUploadInputRef.current?.click();
  };

  const handleRowFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = pendingRowUploadTarget.current;
    if (!file || !target) return;
    setRowBusyId(target.id);
    setError(null);
    const url = await uploadImage(file);
    if (url) {
      const res = await fetch(`/api/admin/home-banners/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Không thể lưu ảnh.");
      }
    }
    setRowBusyId(null);
    await load();
  };

  const clearImage = async (id: string) => {
    setRowBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/home-banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: "" }),
    });
    setRowBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể xoá ảnh.");
      return;
    }
    await load();
  };

  if (!banners) {
    return (
      <Card>
        <ListSkeleton rows={3} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={rowUploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleRowFileChange}
      />

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <BannerSlotSection
        slot="LARGE"
        title="Banner lớn"
        rows={banners.filter((b) => b.slot === "LARGE").sort((a, b) => a.sortOrder - b.sortOrder)}
        showCtaLabelField
        limits={{ title: 80, description: 200, ctaLabel: 30, ctaHref: 200 }}
        emptyHint="Chưa có slide nào — trang chủ đang hiện 1 slide mặc định trong code."
        rowBusyId={rowBusyId}
        onPickRowImage={pickRowImage}
        onClearImage={clearImage}
        uploadImage={uploadImage}
        onReload={load}
        setError={setError}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <BannerSlotSection
          slot="SMALL_1"
          title="Banner nhỏ 1 — Giao dịch an toàn"
          rows={banners.filter((b) => b.slot === "SMALL_1").sort((a, b) => a.sortOrder - b.sortOrder)}
          showCtaLabelField={false}
          limits={{ title: 40, description: 60, ctaHref: 200 }}
          emptyHint="Chưa có slide nào — trang chủ đang hiện 1 thẻ mặc định trong code."
          rowBusyId={rowBusyId}
          onPickRowImage={pickRowImage}
          onClearImage={clearImage}
          uploadImage={uploadImage}
          onReload={load}
          setError={setError}
        />
        <BannerSlotSection
          slot="SMALL_2"
          title="Banner nhỏ 2 — Giao hàng tự động"
          rows={banners.filter((b) => b.slot === "SMALL_2").sort((a, b) => a.sortOrder - b.sortOrder)}
          showCtaLabelField={false}
          limits={{ title: 40, description: 60, ctaHref: 200 }}
          emptyHint="Chưa có slide nào — trang chủ đang hiện 1 thẻ mặc định trong code."
          rowBusyId={rowBusyId}
          onPickRowImage={pickRowImage}
          onClearImage={clearImage}
          uploadImage={uploadImage}
          onReload={load}
          setError={setError}
        />
      </div>
    </div>
  );
}

type FormState = {
  mode: "create" | "edit";
  id?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

function BannerSlotSection({
  slot,
  title,
  rows,
  showCtaLabelField,
  limits,
  emptyHint,
  rowBusyId,
  onPickRowImage,
  onClearImage,
  uploadImage,
  onReload,
  setError,
}: {
  slot: Slot;
  title: string;
  rows: HomeBannerRow[];
  showCtaLabelField: boolean;
  limits: { title: number; description: number; ctaLabel?: number; ctaHref: number };
  emptyHint: string;
  rowBusyId: string | null;
  onPickRowImage: (id: string, slot: Slot) => void;
  onClearImage: (id: string) => void;
  uploadImage: (file: File) => Promise<string | null>;
  onReload: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const modalUploadInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setFormError(null);
    setForm({ mode: "create", title: "", description: "", ctaLabel: "", ctaHref: "", imageUrl: "" });
  };

  const openEdit = (row: HomeBannerRow) => {
    setFormError(null);
    setForm({
      mode: "edit",
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaHref: row.ctaHref ?? "",
      imageUrl: row.imageUrl ?? "",
    });
  };

  const closeForm = () => {
    setForm(null);
    setFormError(null);
  };

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;
    setImageUploading(true);
    const url = await uploadImage(file);
    setImageUploading(false);
    if (url) setForm((f) => (f ? { ...f, imageUrl: url } : f));
  };

  const submitForm = async () => {
    if (!form) return;
    if (form.ctaHref.trim() && !isValidCtaHref(form.ctaHref)) {
      setFormError('Link đích không hợp lệ — phải bắt đầu bằng "/" (nội bộ) hoặc "http(s)://" (bên ngoài).');
      return;
    }
    setFormBusy(true);
    setFormError(null);
    const payload: Record<string, string> = {
      title: form.title.trim(),
      description: form.description.trim(),
      ctaHref: form.ctaHref.trim(),
      imageUrl: form.imageUrl.trim(),
    };
    if (showCtaLabelField) payload.ctaLabel = form.ctaLabel.trim();
    const res =
      form.mode === "create"
        ? await fetch("/api/admin/home-banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slot, ...payload }),
          })
        : await fetch(`/api/admin/home-banners/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
    const data = await res.json().catch(() => null);
    setFormBusy(false);
    if (!res.ok) {
      setFormError(data?.error ?? "Có lỗi xảy ra.");
      return;
    }
    closeForm();
    await onReload();
  };

  const removeRow = async (row: HomeBannerRow) => {
    if (!confirm(`Xoá slide "${row.title || "(chưa đặt tên)"}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/home-banners/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể xoá.");
      return;
    }
    await onReload();
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setDragIndex(null);
    setError(null);
    const res = await fetch("/api/admin/home-banners/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, order: next.map((b) => b.id) }),
    });
    if (!res.ok) {
      setError("Không thể lưu thứ tự — đã tải lại danh sách.");
    }
    await onReload();
  };

  return (
    <Card>
      <SectionTitle
        aside={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Thêm slide
          </Button>
        }
      >
        {title} ({rows.length} slide)
      </SectionTitle>
      <p className="mb-3 text-xs text-[var(--adm-muted)]">
        Kéo-thả để sắp thứ tự trượt. Slide chưa có ảnh riêng tự hiện phong cách mặc định.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--adm-border)] px-3 py-6 text-center text-xs text-[var(--adm-muted)]">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={row.id}
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
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh admin-only, URL bất kỳ (Blob/local)
                <img src={row.imageUrl} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-20 shrink-0 place-items-center rounded-lg bg-[var(--adm-brand)] text-[10px] font-bold text-[#14141f]">
                  Mặc định
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--adm-text)]">
                  {row.title || "(dùng tiêu đề mặc định)"}
                </p>
                <p className="truncate text-xs text-[var(--adm-muted)]">
                  {row.description || "(dùng mô tả mặc định)"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={rowBusyId === row.id}
                  onClick={() => onPickRowImage(row.id, slot)}
                >
                  {rowBusyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
                {row.imageUrl && (
                  <Button size="sm" variant="ghost" disabled={rowBusyId === row.id} onClick={() => onClearImage(row.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => removeRow(row)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeForm}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-black text-[var(--adm-text)]">
                {form.mode === "create" ? `Thêm slide — ${title}` : `Sửa slide — ${title}`}
              </h3>
              <button onClick={closeForm} className="text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                ref={modalUploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleModalFileChange}
              />
              <Field label="Ảnh" hint="Bắt buộc để slide hiện ảnh thật — bỏ trống thì dùng phong cách mặc định (nền màu + chữ).">
                <div className="flex items-center gap-3">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ảnh admin-only, URL bất kỳ (Blob/local)
                    <img src={form.imageUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-[var(--adm-surface-2)] text-[var(--adm-muted)]">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      disabled={imageUploading}
                      onClick={() => modalUploadInputRef.current?.click()}
                    >
                      {imageUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {form.imageUrl ? "Đổi ảnh" : "Tải ảnh"}
                    </Button>
                    {form.imageUrl && (
                      <Button size="sm" variant="ghost" type="button" onClick={() => setForm((f) => (f ? { ...f, imageUrl: "" } : f))}>
                        <X className="h-3.5 w-3.5" /> Bỏ ảnh
                      </Button>
                    )}
                  </div>
                </div>
              </Field>
              <Field label="Tiêu đề" hint="Để trống dùng tiêu đề mặc định (chỉ áp dụng khi slide chưa có ảnh riêng).">
                <TextInput
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={limits.title}
                />
              </Field>
              <Field label={slot === "LARGE" ? "Mô tả ngắn" : "Phụ đề"}>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={limits.description}
                />
              </Field>
              {showCtaLabelField && (
                <Field label="Nút CTA — nhãn" hint="Để trống thì ẩn hẳn nút (chỉ áp dụng khi chưa có ảnh riêng).">
                  <TextInput
                    value={form.ctaLabel}
                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                    maxLength={limits.ctaLabel}
                  />
                </Field>
              )}
              <Field
                label="Link đích (tuỳ chọn)"
                hint='Để trống = ảnh chỉ trang trí, không bấm được. Nội bộ: "/danh-muc/gmail" (cùng tab). Bên ngoài: "https://..." (tự mở tab mới).'
              >
                <TextInput
                  value={form.ctaHref}
                  onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
                  maxLength={limits.ctaHref}
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
                  {form.mode === "create" ? "Tạo slide" : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
