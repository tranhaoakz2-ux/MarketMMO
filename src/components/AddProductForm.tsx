"use client";

import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Category = { id: string; slug: string; name: string; emoji: string };

// Biến thể nháp — seller điền ngay trong lúc đăng sản phẩm (thay vì phải
// quay lại sau qua ProductVariantManager). `stockItems` là nội dung kho
// dữ liệu giao hàng thật (mỗi dòng = 1 đơn vị) dán kèm luôn cho biến thể
// này — không bắt buộc, seller vẫn có thể "Nhập kho" sau ở trang quản lý.
type DraftVariant = {
  key: string;
  label: string;
  price: string;
  stock: string;
  stockItems: string;
};

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
  // Kho dữ liệu giao hàng thật cho SẢN PHẨM GỐC — chỉ dùng khi không thêm
  // biến thể nào bên dưới (khớp đúng quy tắc "Product.stock chỉ thật sự
  // dùng khi sản phẩm chưa có variant" đã có sẵn trong hệ thống).
  const [baseStockItems, setBaseStockItems] = useState("");
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { key: crypto.randomUUID(), label: "", price: "", stock: "", stockItems: "" },
    ]);
  };
  const removeVariantRow = (key: string) => {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  };
  const updateVariant = (key: string, field: keyof DraftVariant, value: string) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };

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
    setBaseStockItems("");
    setVariants([]);
  };

  // Đăng sản phẩm + biến thể + nhập kho TRONG CÙNG 1 LẦN GỬI — thay vì phải
  // tạo sản phẩm xong mới quay lại trang quản lý để thêm biến thể/nhập kho
  // riêng từng bước như trước. Vẫn gọi tuần tự 3 API có sẵn (products →
  // variants → stock, không gộp thành 1 transaction backend) vì đây là thao
  // tác quản trị của seller (không đụng tiền/tồn kho của buyer) — lỡ 1 bước
  // sau lỗi thì sản phẩm/biến thể đã tạo vẫn còn nguyên, seller sửa tiếp
  // được ngay tại ProductVariantManager bên dưới, không mất dữ liệu đã nhập.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!image) {
      setError("Vui lòng chọn ảnh sản phẩm.");
      return;
    }
    for (const v of variants) {
      if (!v.label.trim() || !v.price) {
        setError("Vui lòng điền đủ tên và giá cho mọi biến thể đã thêm.");
        return;
      }
    }

    setLoading(true);
    const form = new FormData();
    form.append("name", name);
    form.append("categoryId", categoryId);
    form.append("shortDescription", shortDescription);
    form.append("description", description);
    form.append("price", price);
    // Nếu sẽ dán kho ngay cho sản phẩm gốc (không có biến thể), gửi stock=0
    // và để bước "nhập kho" bên dưới tự cộng đúng theo số dòng — tránh cộng
    // trùng nếu seller lỡ điền cả 2 nơi.
    form.append("stock", variants.length === 0 && baseStockItems.trim() ? "0" : stock);
    form.append("image", image);

    const res = await fetch("/api/seller/products", { method: "POST", body: form });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "Không thể đăng sản phẩm, vui lòng thử lại.");
      return;
    }

    const productId: string = data.id;
    const stepErrors: string[] = [];

    if (variants.length === 0) {
      if (baseStockItems.trim()) {
        const stockRes = await fetch(`/api/seller/products/${productId}/stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: baseStockItems }),
        });
        if (!stockRes.ok) {
          const stockData = await stockRes.json().catch(() => null);
          stepErrors.push(`Nhập kho sản phẩm: ${stockData?.error ?? "thất bại"}`);
        }
      }
    } else {
      for (const v of variants) {
        const variantRes = await fetch(`/api/seller/products/${productId}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: v.label.trim(),
            price: Number(v.price),
            // Cùng logic tránh cộng trùng như sản phẩm gốc ở trên.
            stock: v.stockItems.trim() ? 0 : Number(v.stock || 0),
          }),
        });
        const variantData = await variantRes.json().catch(() => null);
        if (!variantRes.ok) {
          stepErrors.push(`Biến thể "${v.label}": ${variantData?.error ?? "thất bại"}`);
          continue;
        }
        if (v.stockItems.trim()) {
          const stockRes = await fetch(`/api/seller/products/${productId}/stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId: variantData.variant.id, items: v.stockItems }),
          });
          if (!stockRes.ok) {
            const stockData = await stockRes.json().catch(() => null);
            stepErrors.push(`Nhập kho biến thể "${v.label}": ${stockData?.error ?? "thất bại"}`);
          }
        }
      }
    }

    setLoading(false);

    if (stepErrors.length > 0) {
      setError(
        `Đã tạo sản phẩm nhưng có lỗi ở vài bước sau — vào phần "Sản phẩm" bên dưới để bổ sung: ${stepErrors.join(" | ")}`
      );
    } else {
      setSuccess("Đã gửi sản phẩm (kèm biến thể/kho nếu có) — chờ admin duyệt trước khi hiện công khai trên site.");
    }
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
                required={!baseStockItems.trim()}
                min={0}
                disabled={variants.length === 0 && Boolean(baseStockItems.trim())}
                value={variants.length === 0 && baseStockItems.trim() ? "" : stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={
                  variants.length === 0 && baseStockItems.trim() ? "Tự tính theo kho" : "VD: 50"
                }
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none disabled:bg-surface-alt disabled:text-muted"
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

      <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-ink">Biến thể / Gói (tuỳ chọn)</p>
            <p className="text-[11px] text-muted">
              Chỉ điền nếu sản phẩm có nhiều loại/gói giá khác nhau. Bỏ qua
              nếu chỉ bán 1 loại duy nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-brand-dark ring-1 ring-brand-dark/30 hover:bg-brand-light/20"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm biến thể
          </button>
        </div>

        {variants.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {variants.map((v) => (
              <div key={v.key} className="rounded-lg border border-border-c bg-surface p-2.5">
                <div className="grid gap-2 sm:grid-cols-[1fr_120px_100px_auto]">
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={v.label}
                    onChange={(e) => updateVariant(v.key, "label", e.target.value)}
                    placeholder="Tên biến thể (VD: Domain .US - Thuê 24h)"
                    className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none"
                  />
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={v.price}
                    onChange={(e) => updateVariant(v.key, "price", e.target.value)}
                    placeholder="Giá (đ)"
                    className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    disabled={Boolean(v.stockItems.trim())}
                    value={v.stockItems.trim() ? "" : v.stock}
                    onChange={(e) => updateVariant(v.key, "stock", e.target.value)}
                    placeholder={v.stockItems.trim() ? "Tự tính theo kho" : "Kho"}
                    className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs focus:border-brand-dark focus:outline-none disabled:bg-surface-alt disabled:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantRow(v.key)}
                    className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label="Xoá biến thể"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={v.stockItems}
                  onChange={(e) => updateVariant(v.key, "stockItems", e.target.value)}
                  rows={2}
                  placeholder="Kho dữ liệu giao hàng thật cho biến thể này (tuỳ chọn) — mỗi dòng 1 sản phẩm sẽ giao cho khách"
                  className="mt-2 w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-[11px] focus:border-brand-dark focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {variants.length === 0 && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-ink">
              Kho dữ liệu giao hàng thật (tuỳ chọn)
            </label>
            <textarea
              value={baseStockItems}
              onChange={(e) => setBaseStockItems(e.target.value)}
              rows={3}
              placeholder={"Mỗi dòng là 1 sản phẩm sẽ giao TỰ ĐỘNG cho khách, ví dụ:\nemail1@gmail.com|MatKhau123|MaKhoiPhuc\nemail2@gmail.com|MatKhau456|MaKhoiPhuc"}
              className="w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-xs focus:border-brand-dark focus:outline-none"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-ink/70">
              Có dán dữ liệu ở đây thì ô &ldquo;Kho&rdquo; phía trên sẽ tự
              động tính theo số dòng, không cần tự gõ số nữa. Bỏ trống thì
              &ldquo;Kho&rdquo; hoạt động như số đếm thông thường (chưa giao
              hàng tự động), có thể nhập kho sau tại mục &ldquo;Sản
              phẩm&rdquo; bên dưới.
            </p>
          </div>
        )}
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
