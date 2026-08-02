"use client";

// Panel quản trị Banner trang chủ (model HomeBanner) — thay hệ thống 4 ô ảnh
// cố định cũ trong AdminSiteContentPanel (SiteConfig chỉ lưu URL ảnh đơn,
// không đủ cho thiết kế banner mới có tiêu đề/mô tả/CTA + số lượng slide
// động). slot="LARGE": danh sách kéo-thả sắp thứ tự (giống
// AdminFeaturedPanel), thêm/sửa/xoá tự do. slot="SMALL_1"/"SMALL_2": đúng 1
// dòng mỗi loại, sửa tại chỗ, không thêm/xoá được.
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

type HomeBannerRow = {
  id: string;
  slot: "LARGE" | "SMALL_1" | "SMALL_2";
  sortOrder: number;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
};

type FormState = {
  mode: "create" | "edit";
  id?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

const EMPTY_FORM: Omit<FormState, "mode"> = { title: "", description: "", ctaLabel: "", ctaHref: "" };

export default function AdminHomeBannerPanel() {
  const [banners, setBanners] = useState<HomeBannerRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadTargetId = useRef<string | null>(null);

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

  if (!banners) {
    return (
      <Card>
        <ListSkeleton rows={3} />
      </Card>
    );
  }

  const large = banners.filter((b) => b.slot === "LARGE").sort((a, b) => a.sortOrder - b.sortOrder);
  const small1 = banners.find((b) => b.slot === "SMALL_1") ?? null;
  const small2 = banners.find((b) => b.slot === "SMALL_2") ?? null;

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

  // Ảnh cho slide LARGE đã tồn tại (id thật) -> PATCH ngay imageUrl. Ảnh cho
  // slot SMALL_1/SMALL_2 khi CHƯA có dòng nào (id=null) -> POST tạo mới kèm
  // luôn imageUrl vừa upload trong 1 lần gọi.
  const handlePickImage = (targetId: string | null, slot: HomeBannerRow["slot"]) => {
    pendingUploadTargetId.current = targetId ?? `NEW:${slot}`;
    uploadInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = pendingUploadTargetId.current;
    if (!file || !target) return;
    setBusyId(target);
    setError(null);
    const url = await uploadImage(file);
    if (!url) {
      setBusyId(null);
      return;
    }
    if (target.startsWith("NEW:")) {
      const slot = target.slice(4) as HomeBannerRow["slot"];
      const res = await fetch("/api/admin/home-banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, imageUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Không thể lưu ảnh.");
      }
    } else {
      const res = await fetch(`/api/admin/home-banners/${target}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Không thể lưu ảnh.");
      }
    }
    setBusyId(null);
    await load();
  };

  const clearImage = async (id: string) => {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/home-banners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: "" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể xoá ảnh.");
      return;
    }
    await load();
  };

  const openCreateLarge = () => {
    setFormError(null);
    setForm({ mode: "create", ...EMPTY_FORM });
  };

  const openEditLarge = (row: HomeBannerRow) => {
    setFormError(null);
    setForm({
      mode: "edit",
      id: row.id,
      title: row.title ?? "",
      description: row.description ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaHref: row.ctaHref ?? "",
    });
  };

  const closeForm = () => {
    setForm(null);
    setFormError(null);
  };

  const submitForm = async () => {
    if (!form) return;
    setFormBusy(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      ctaLabel: form.ctaLabel.trim(),
      ctaHref: form.ctaHref.trim(),
    };
    const res =
      form.mode === "create"
        ? await fetch("/api/admin/home-banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slot: "LARGE", ...payload }),
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
    await load();
  };

  const removeLarge = async (row: HomeBannerRow) => {
    if (!confirm(`Xoá slide "${row.title || "(chưa đặt tên)"}"?`)) return;
    setBusyId(row.id);
    setError(null);
    const res = await fetch(`/api/admin/home-banners/${row.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể xoá.");
      return;
    }
    await load();
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...large];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setDragIndex(null);
    setBanners((prev) =>
      prev ? [...prev.filter((b) => b.slot !== "LARGE"), ...next.map((b, i) => ({ ...b, sortOrder: i }))] : prev
    );
    const res = await fetch("/api/admin/home-banners/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((b) => b.id) }),
    });
    if (!res.ok) {
      setError("Không thể lưu thứ tự — đã tải lại danh sách.");
      await load();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      <Card>
        <SectionTitle
          aside={
            <Button size="sm" onClick={openCreateLarge}>
              <Plus className="h-3.5 w-3.5" /> Thêm slide
            </Button>
          }
        >
          Banner lớn ({large.length} slide)
        </SectionTitle>
        <p className="mb-3 text-xs text-[var(--adm-muted)]">
          Kéo-thả để sắp thứ tự trượt. Slide chưa có ảnh riêng tự hiện phong cách mặc định (nền vàng + chữ + nút).
        </p>
        {large.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--adm-border)] px-3 py-6 text-center text-xs text-[var(--adm-muted)]">
            Chưa có slide nào — trang chủ đang hiện 1 slide mặc định trong code.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {large.map((row, i) => (
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
                    disabled={busyId === row.id}
                    onClick={() => handlePickImage(row.id, "LARGE")}
                  >
                    {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                  {row.imageUrl && (
                    <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => clearImage(row.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEditLarge(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="danger" disabled={busyId === row.id} onClick={() => removeLarge(row)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <SmallBannerEditor
          row={small1}
          slot="SMALL_1"
          label="Banner nhỏ 1 — Giao dịch an toàn"
          busy={busyId}
          onPickImage={handlePickImage}
          onClearImage={clearImage}
          onSaved={load}
          setError={setError}
        />
        <SmallBannerEditor
          row={small2}
          slot="SMALL_2"
          label="Banner nhỏ 2 — Giao hàng tự động"
          busy={busyId}
          onPickImage={handlePickImage}
          onClearImage={clearImage}
          onSaved={load}
          setError={setError}
        />
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeForm}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-black text-[var(--adm-text)]">
                {form.mode === "create" ? "Thêm slide banner lớn" : "Sửa slide banner lớn"}
              </h3>
              <button onClick={closeForm} className="text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Tiêu đề" hint="Để trống dùng tiêu đề mặc định (chỉ áp dụng khi slide chưa có ảnh riêng).">
                <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Mô tả ngắn">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={200}
                />
              </Field>
              <Field label="Nút CTA — nhãn" hint="Để trống thì ẩn hẳn nút (chỉ áp dụng khi chưa có ảnh riêng).">
                <TextInput value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} maxLength={30} />
              </Field>
              <Field label="Nút CTA — link" hint="Ảnh có sẵn cũng dùng link này khi bấm vào banner. Vd: /danh-muc/gmail">
                <TextInput value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} maxLength={200} />
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
    </div>
  );
}

function SmallBannerEditor({
  row,
  slot,
  label,
  busy,
  onPickImage,
  onClearImage,
  onSaved,
  setError,
}: {
  row: HomeBannerRow | null;
  slot: "SMALL_1" | "SMALL_2";
  label: string;
  busy: string | null;
  onPickImage: (id: string | null, slot: HomeBannerRow["slot"]) => void;
  onClearImage: (id: string) => void;
  onSaved: () => Promise<void>;
  setError: (msg: string | null) => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setTitle(row?.title ?? "");
    setDescription(row?.description ?? "");
  }, [row]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = { title: title.trim(), description: description.trim() };
    const res = row
      ? await fetch(`/api/admin/home-banners/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/home-banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot, ...payload }),
        });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không thể lưu.");
      return;
    }
    dirtyRef.current = false;
    await onSaved();
  };

  const busyThis = busy === (row?.id ?? `NEW:${slot}`);

  return (
    <Card>
      <SectionTitle>{label}</SectionTitle>
      <div className="mb-3 flex items-center gap-3">
        {row?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh admin-only, URL bất kỳ (Blob/local)
          <img src={row.imageUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-[var(--adm-surface-2)] text-[var(--adm-muted)]">
            <ImagePlus className="h-5 w-5" />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="secondary" disabled={busyThis} onClick={() => onPickImage(row?.id ?? null, slot)}>
            {busyThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Tải ảnh
          </Button>
          {row?.imageUrl && (
            <Button size="sm" variant="ghost" disabled={busyThis} onClick={() => onClearImage(row.id)}>
              <X className="h-3.5 w-3.5" /> Bỏ ảnh
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Tiêu đề" hint="Để trống dùng tiêu đề mặc định.">
          <TextInput
            value={title}
            onChange={(e) => {
              dirtyRef.current = true;
              setTitle(e.target.value);
            }}
            maxLength={40}
          />
        </Field>
        <Field label="Phụ đề">
          <TextInput
            value={description}
            onChange={(e) => {
              dirtyRef.current = true;
              setDescription(e.target.value);
            }}
            maxLength={60}
          />
        </Field>
        <div>
          <Button size="sm" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu
          </Button>
        </div>
      </div>
    </Card>
  );
}
