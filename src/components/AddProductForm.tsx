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
  // Bản sao cục bộ của danh sách danh mục — cho phép chèn thêm danh mục seller
  // vừa tự đề xuất (POST /api/seller/categories) vào dropdown ngay lập tức mà
  // không cần tải lại trang (server component cha chỉ fetch 1 lần lúc render).
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [categoryId, setCategoryId] = useState("");
  // Seller tự bấm chọn 1 lần trong dropdown thì không tự động ghi đè gợi ý
  // nữa, kể cả khi họ gõ tiếp tên sản phẩm — chỉ gợi ý khi field còn "trinh".
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
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
    const match = localCategories.find((c) => c.slug === slug);
    if (match) setCategoryId(match.id);
  }, [name, categoryTouched, localCategories]);

  const handleProposeCategory = async () => {
    const trimmed = newCategoryName.trim();
    setCategoryError(null);
    setCategoryNotice(null);
    if (trimmed.length < 2 || trimmed.length > 40) {
      setCategoryError("Tên danh mục phải từ 2-40 ký tự.");
      return;
    }

    setCategorySubmitting(true);
    const res = await fetch("/api/seller/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => null);
    setCategorySubmitting(false);

    if (!res.ok) {
      setCategoryError(data?.error ?? "Không thể gửi danh mục, vui lòng thử lại.");
      return;
    }

    const newCategory: Category = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      emoji: data.emoji,
    };
    setLocalCategories((prev) => [...prev, newCategory]);
    setCategoryId(newCategory.id);
    setCategoryTouched(true);
    setNewCategoryName("");
    setAddingCategory(false);
    setCategoryNotice(
      `Đã gửi danh mục "${newCategory.name}" để admin duyệt — bạn có thể chọn danh mục này ngay cho sản phẩm.`
    );
  };

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
    setAddingCategory(false);
    setNewCategoryName("");
    setCategoryError(null);
    setCategoryNotice(null);
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
              {localCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>

            {!addingCategory ? (
              <button
                type="button"
                onClick={() => {
                  setAddingCategory(true);
                  setCategoryNotice(null);
                }}
                className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
              >
                <Plus className="h-3 w-3" /> Thêm danh mục mới chưa có
              </button>
            ) : (
              <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg border border-dashed border-brand-dark/40 bg-brand-light/10 p-2.5">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="VD: Netflix"
                    maxLength={40}
                    className="w-full rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleProposeCategory}
                    disabled={categorySubmitting}
                    className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
                  >
                    {categorySubmitting ? "Đang gửi..." : "Gửi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCategory(false);
                      setNewCategoryName("");
                      setCategoryError(null);
                    }}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-surface-alt"
                  >
                    Huỷ
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-ink/70">
                  Danh mục mới sẽ được gửi để admin duyệt trước khi hiện công
                  khai trên site — bạn vẫn có thể chọn ngay danh mục này cho
                  sản phẩm đang đăng.
                </p>
                {categoryError && (
                  <p className="text-[11px] font-semibold text-danger">{categoryError}</p>
                )}
              </div>
            )}
            {categoryNotice && (
              <p className="mt-1.5 text-[11px] font-semibold text-success">{categoryNotice}</p>
            )}
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
