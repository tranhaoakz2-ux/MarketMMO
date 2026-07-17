"use client";

import { Check, ImagePlus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

type Category = { id: string; slug: string; name: string; emoji: string };

// Từ khoá gợi ý danh mục theo tên sản phẩm — chỉ GỢI Ý (tự điền sẵn dropdown),
// seller vẫn tự chọn lại được nếu đoán sai, không khoá cứng. So khớp theo
// "từ nguyên vẹn" (word boundary) trên chuỗi đã bỏ dấu tiếng Việt, tránh
// khớp nhầm vào giữa 1 từ khác (vd "x" không khớp vào "explorer").
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gmail: ["gmail"],
  facebook: ["facebook", "fb"],
  youtube: ["youtube", "yt"],
  discord: ["discord"],
  tiktok: ["tiktok", "tik tok"],
  outlook: ["outlook", "hotmail"],
  chatgpt: ["chatgpt", "chat gpt", "gpt", "openai"],
  steam: ["steam"],
  twitter: ["twitter", "x"],
  boosting: ["boost", "boosting", "cay thue", "leveling", "rank"],
};

function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCategorySlug(productName: string): string | null {
  const normalized = normalizeVietnamese(productName);
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
      if (pattern.test(normalized)) return slug;
    }
  }
  return null;
}

export default function AddProductForm({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  // Seller tự bấm chọn 1 lần trong dropdown thì không tự động ghi đè gợi ý
  // nữa, kể cả khi họ gõ tiếp tên sản phẩm — chỉ gợi ý khi field còn "trinh".
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryTouched) return;
    const slug = detectCategorySlug(name);
    if (!slug) return;
    const match = categories.find((c) => c.slug === slug);
    if (match) setCategoryId(match.id);
  }, [name, categoryTouched, categories]);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh vượt quá 5MB.");
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setName("");
    setCategoryId("");
    setCategoryTouched(false);
    setShortDescription("");
    setDescription("");
    setPrice("");
    setStock("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!image) {
      setError("Vui lòng chọn ảnh sản phẩm.");
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append("name", name);
    form.append("categoryId", categoryId);
    form.append("shortDescription", shortDescription);
    form.append("description", description);
    form.append("price", price);
    form.append("stock", stock);
    form.append("image", image);

    const res = await fetch("/api/seller/products", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Không thể đăng sản phẩm, vui lòng thử lại.");
      return;
    }

    setSuccess("Đã gửi sản phẩm — chờ admin duyệt trước khi hiện công khai trên site.");
    resetForm();
    onCreated();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-dark/40 bg-brand-light/10 p-6 text-sm font-bold text-brand-dark transition hover:bg-brand-light/25"
      >
        <Plus className="h-4 w-4" /> Đăng sản phẩm mới
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border-c bg-surface p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-ink">Đăng sản phẩm mới</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-ink"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Ảnh sản phẩm</label>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-c bg-surface-alt text-muted hover:border-brand-dark hover:text-brand-dark">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- xem trước ảnh cục bộ trước khi upload (object URL, không phải asset)
              <img src={previewUrl} alt="Xem trước" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-semibold">Chọn ảnh</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePickImage}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Tên sản phẩm</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Gmail Việt Nam random full 2020-2023"
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink">
              Danh mục
              {!categoryTouched && categoryId && (
                <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">
                  Tự động gợi ý
                </span>
              )}
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCategoryTouched(true);
              }}
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Giá (đ)</label>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 15000"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Kho</label>
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="VD: 50"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Mô tả ngắn</label>
        <input
          type="text"
          required
          minLength={10}
          maxLength={200}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="1 câu ngắn hiện trên thẻ sản phẩm"
          className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Mô tả chi tiết</label>
        <textarea
          required
          minLength={20}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"Mỗi dòng là 1 đoạn mô tả, ví dụ:\nTài khoản chính chủ, đã xác minh 2 lớp.\nBảo hành 7 ngày lỗi 1 đổi 1.\nGiao hàng tự động ngay sau khi thanh toán."}
          className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm focus:border-brand-dark focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5" /> {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 self-start rounded-full bg-brand px-6 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {loading ? "Đang gửi..." : "Gửi để duyệt"}
      </button>
    </form>
  );
}
