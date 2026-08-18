"use client";

import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  MIN_WARRANTY_HOURS_PRODUCT,
  SERVICE_DELIVERY_METHOD_LABEL,
  SERVICE_DELIVERY_METHODS,
  SERVICE_FIELD_INPUT_TYPE_LABEL,
  SERVICE_FIELD_INPUT_TYPES,
  type ServiceDeliveryMethod,
  type ServiceFieldInputType,
} from "@/lib/constants";
import { toWarrantyHours } from "@/lib/warranty";

type Category = { id: string; slug: string; name: string; emoji: string };

// Field buyer phải nhập khi đặt dịch vụ này (seller tự khai) — xem model
// ServiceFieldDefinition. `inputType==="secret"` là NGUỒN DUY NHẤT đánh dấu
// nhạy cảm (mật khẩu/OTP), server tự mã hoá field đó khi buyer checkout.
type DraftServiceField = {
  key: string;
  label: string;
  inputType: ServiceFieldInputType;
  required: boolean;
};

// Phiên bản nháp — seller điền ngay trong lúc đăng sản phẩm (thay vì phải
// quay lại sau qua ProductVariantManager). `stockItems` là nội dung kho
// dữ liệu giao hàng thật (mỗi dòng = 1 đơn vị) dán kèm luôn cho phiên bản
// này — không bắt buộc, seller vẫn có thể "Nhập kho" sau ở trang quản lý.
type DraftVariant = {
  key: string;
  label: string;
  price: string;
  stock: string;
  stockItems: string;
  // Thời hạn sử dụng (tuỳ chọn) — hasExpiry chỉ là UI state, không lưu ở
  // Product/Variant nào; "có thời hạn hay không" tự suy ra từ dữ liệu kho
  // sau khi lưu (xem ProductStockItem.expiresAt). expiresAtItems khớp theo
  // SỐ THỨ TỰ DÒNG với stockItems (dòng N = hạn của dòng N).
  hasExpiry: boolean;
  nominalTermDays: string;
  expiresAtItems: string;
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
  onClose,
}: {
  categories: Category[];
  onCreated: () => void;
  onClose?: () => void;
}) {
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
  // phiên bản nào bên dưới (khớp đúng quy tắc "Product.stock chỉ thật sự
  // dùng khi sản phẩm chưa có variant" đã có sẵn trong hệ thống).
  const [baseStockItems, setBaseStockItems] = useState("");
  const [baseHasExpiry, setBaseHasExpiry] = useState(false);
  const [baseNominalTermDays, setBaseNominalTermDays] = useState("30");
  const [baseExpiresAtItems, setBaseExpiresAtItems] = useState("");
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dịch vụ: buyer phải cung cấp thông tin (tài khoản/link/mật khẩu...) cho
  // seller thực hiện — xem model ServiceFieldDefinition/ServiceIntake. Ẩn
  // hẳn khối "Phiên bản/Kho dữ liệu giao hàng thật" (dành cho PRODUCT, nơi
  // SELLER giao sẵn nội dung) khi chọn Dịch vụ — 2 khái niệm không áp dụng
  // cùng lúc cho 1 sản phẩm trong phạm vi tính năng này.
  const [productType, setProductType] = useState<"PRODUCT" | "SERVICE" | "TUT_TRICK" | "TOOL">(
    "PRODUCT"
  );
  const [serviceDeliveryMethods, setServiceDeliveryMethods] = useState<ServiceDeliveryMethod[]>([]);
  const [credentialViewWindowHours, setCredentialViewWindowHours] = useState("");
  const [serviceFields, setServiceFields] = useState<DraftServiceField[]>([]);
  // TUT-Trick: nội dung hướng dẫn ĐẦY ĐỦ (quy trình, cách làm) — riêng tư,
  // chỉ mở cho buyer đã mua (xem Product.tutTrickContent). KHÁC "Mô tả chi
  // tiết" (description, vẫn giữ làm teaser public giới thiệu, không lộ đáp án).
  const [tutTrickContent, setTutTrickContent] = useState("");
  // Tool/AI Agent: quy trình sử dụng ĐẦY ĐỦ — riêng tư, cùng nguyên tắc
  // tutTrickContent ở trên. Credential (tài khoản/mật khẩu tool) KHÔNG có
  // field riêng — dùng LẠI nguyên khối "Phiên bản/Kho dữ liệu giao hàng
  // thật" đã có cho PRODUCT (mở thêm cho TOOL bên dưới), server tự mã hoá
  // từng dòng khi productType="TOOL" (xem POST .../stock).
  const [toolUsageGuide, setToolUsageGuide] = useState("");
  // Tool/AI Agent: 2 hình thức giao THÊM bên cạnh "Kho tài khoản tool" ở
  // trên — link tải (Google Drive/MediaFire...) và file .zip upload lên sàn,
  // cả 2 optional + kết hợp tự do với kho tài khoản (xem
  // Product.toolDeliveryLink/toolFileUrl trong schema.prisma).
  const [toolDeliveryLink, setToolDeliveryLink] = useState("");
  const [toolFile, setToolFile] = useState<File | null>(null);
  const [toolFileError, setToolFileError] = useState<string | null>(null);

  // Thời gian bảo hành — áp dụng cho CẢ 4 loại hàng (xem Product.warrantyValue/
  // warrantyUnit trong schema.prisma). "Sản phẩm" (tài khoản/dữ liệu kho
  // thật) bị ép tối thiểu MIN_WARRANTY_HOURS_PRODUCT, không cho "bán đứt" —
  // checkbox tự khoá + tắt khi chọn loại này (xem handleProductType bên dưới).
  const [warrantyValue, setWarrantyValue] = useState("7");
  const [warrantyUnit, setWarrantyUnit] = useState<"hour" | "day">("day");
  const [noWarranty, setNoWarranty] = useState(false);

  // Đổi loại sản phẩm — reset noWarranty nếu đang chọn "Sản phẩm" (checkbox
  // "Không bảo hành" bị khoá/ẩn tác dụng cho loại này, tránh state kẹt lại
  // true từ lúc còn ở loại khác rồi chuyển sang PRODUCT).
  const handleProductType = (type: typeof productType) => {
    setProductType(type);
    if (type === "PRODUCT") setNoWarranty(false);
  };

  const toggleServiceDeliveryMethod = (method: ServiceDeliveryMethod) => {
    setServiceDeliveryMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };
  const addServiceField = () => {
    setServiceFields((prev) => [
      ...prev,
      { key: crypto.randomUUID(), label: "", inputType: "text", required: true },
    ]);
  };
  const removeServiceField = (key: string) => {
    setServiceFields((prev) => prev.filter((f) => f.key !== key));
  };
  const updateServiceField = <K extends keyof DraftServiceField>(
    key: string,
    field: K,
    value: DraftServiceField[K]
  ) => {
    setServiceFields((prev) => prev.map((f) => (f.key === key ? { ...f, [field]: value } : f)));
  };

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        label: "",
        price: "",
        stock: "",
        stockItems: "",
        hasExpiry: false,
        nominalTermDays: "30",
        expiresAtItems: "",
      },
    ]);
  };
  const removeVariantRow = (key: string) => {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  };
  const updateVariant = (
    key: string,
    field: Exclude<keyof DraftVariant, "hasExpiry">,
    value: string
  ) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };
  const toggleVariantExpiry = (key: string, checked: boolean) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, hasExpiry: checked } : v)));
  };

  useEffect(() => {
    if (categoryTouched) return;
    const slug = detectCategorySlug(name);
    if (!slug) return;
    const match = localCategories.find((c) => c.slug === slug);
    if (!match) return;
    (async () => {
      setCategoryId(match.id);
    })();
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
    setBaseHasExpiry(false);
    setBaseNominalTermDays("30");
    setBaseExpiresAtItems("");
    setVariants([]);
    setProductType("PRODUCT");
    setServiceDeliveryMethods([]);
    setCredentialViewWindowHours("");
    setServiceFields([]);
    setTutTrickContent("");
    setToolUsageGuide("");
    setWarrantyValue("7");
    setWarrantyUnit("day");
    setNoWarranty(false);
  };

  // Đăng sản phẩm + phiên bản + nhập kho TRONG CÙNG 1 LẦN GỬI — thay vì phải
  // tạo sản phẩm xong mới quay lại trang quản lý để thêm phiên bản/nhập kho
  // riêng từng bước như trước. Vẫn gọi tuần tự 3 API có sẵn (products →
  // variants → stock, không gộp thành 1 transaction backend) vì đây là thao
  // tác quản trị của seller (không đụng tiền/tồn kho của buyer) — lỡ 1 bước
  // sau lỗi thì sản phẩm/phiên bản đã tạo vẫn còn nguyên, seller sửa tiếp
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
        setError("Vui lòng điền đủ tên và giá cho mọi phiên bản đã thêm.");
        return;
      }
    }
    if (productType === "SERVICE") {
      if (serviceDeliveryMethods.length === 0) {
        setError("Vui lòng chọn ít nhất 1 phương thức bàn giao cho dịch vụ.");
        return;
      }
      if (serviceFields.length === 0) {
        setError("Vui lòng khai ít nhất 1 trường thông tin buyer cần nhập cho dịch vụ.");
        return;
      }
      for (const f of serviceFields) {
        if (f.label.trim().length < 2) {
          setError("Vui lòng điền đủ nhãn (tối thiểu 2 ký tự) cho mọi trường thông tin dịch vụ.");
          return;
        }
      }
    }
    if (productType === "TUT_TRICK") {
      const len = tutTrickContent.trim().length;
      if (len < 20 || len > 20000) {
        setError("Nội dung hướng dẫn phải từ 20-20.000 ký tự.");
        return;
      }
    }
    if (productType === "TOOL") {
      const len = toolUsageGuide.trim().length;
      if (len < 20 || len > 20000) {
        setError("Quy trình sử dụng phải từ 20-20.000 ký tự.");
        return;
      }
      const link = toolDeliveryLink.trim();
      if (link && !/^https?:\/\/.+/i.test(link)) {
        setError("Link tải tool không hợp lệ — phải bắt đầu bằng http:// hoặc https://.");
        return;
      }
      // 20MB — khớp MAX_TOOL_FILE_SIZE ở src/lib/uploads.ts (không import
      // được thẳng vì file đó dùng API Node.js server-only).
      if (toolFile && toolFile.size > 20 * 1024 * 1024) {
        setError("File tool vượt quá 20MB.");
        return;
      }
    }
    if (!noWarranty) {
      const num = Number(warrantyValue);
      if (!Number.isInteger(num) || num < 0) {
        setError("Thời gian bảo hành phải là số nguyên >= 0.");
        return;
      }
      if (productType === "PRODUCT" && toWarrantyHours(num, warrantyUnit) < MIN_WARRANTY_HOURS_PRODUCT) {
        setError(
          `Sản phẩm (tài khoản/dữ liệu) phải bảo hành tối thiểu ${MIN_WARRANTY_HOURS_PRODUCT} giờ.`
        );
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
    // Nếu sẽ dán kho ngay cho sản phẩm gốc (không có phiên bản), gửi stock=0
    // và để bước "nhập kho" bên dưới tự cộng đúng theo số dòng — tránh cộng
    // trùng nếu seller lỡ điền cả 2 nơi.
    form.append("stock", variants.length === 0 && baseStockItems.trim() ? "0" : stock);
    form.append("image", image);
    form.append("productType", productType);
    if (noWarranty) {
      form.append("noWarranty", "true");
    } else {
      form.append("warrantyValue", warrantyValue);
      form.append("warrantyUnit", warrantyUnit);
    }
    if (productType === "SERVICE") {
      form.append("serviceDeliveryMethods", JSON.stringify(serviceDeliveryMethods));
      if (credentialViewWindowHours.trim()) {
        form.append("credentialViewWindowHours", credentialViewWindowHours.trim());
      }
      form.append(
        "serviceFields",
        JSON.stringify(
          serviceFields.map((f) => ({
            label: f.label.trim(),
            inputType: f.inputType,
            required: f.required,
          }))
        )
      );
    }
    if (productType === "TUT_TRICK") {
      form.append("tutTrickContent", tutTrickContent.trim());
    }
    if (productType === "TOOL") {
      form.append("toolUsageGuide", toolUsageGuide.trim());
      if (toolDeliveryLink.trim()) {
        form.append("toolDeliveryLink", toolDeliveryLink.trim());
      }
      if (toolFile) {
        form.append("toolFile", toolFile);
      }
    }

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
          body: JSON.stringify({
            items: baseStockItems,
            ...(baseHasExpiry
              ? {
                  expiresAt: baseExpiresAtItems,
                  nominalTermDays: Number(baseNominalTermDays),
                }
              : {}),
          }),
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
          stepErrors.push(`Phiên bản "${v.label}": ${variantData?.error ?? "thất bại"}`);
          continue;
        }
        if (v.stockItems.trim()) {
          const stockRes = await fetch(`/api/seller/products/${productId}/stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variantId: variantData.variant.id,
              items: v.stockItems,
              ...(v.hasExpiry
                ? { expiresAt: v.expiresAtItems, nominalTermDays: Number(v.nominalTermDays) }
                : {}),
            }),
          });
          if (!stockRes.ok) {
            const stockData = await stockRes.json().catch(() => null);
            stepErrors.push(`Nhập kho phiên bản "${v.label}": ${stockData?.error ?? "thất bại"}`);
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
      setSuccess("Đã gửi sản phẩm (kèm phiên bản/kho nếu có) — chờ admin duyệt trước khi hiện công khai trên site.");
    }
    resetForm();
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-brand-dark/30 bg-surface p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink">
            <Plus className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-black text-foreground">Đăng Sản Phẩm Mới</h3>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-foreground"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Loại sản phẩm</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => handleProductType("PRODUCT")}
            className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-bold transition ${
              productType === "PRODUCT"
                ? "border-brand bg-brand text-ink"
                : "border-border-c bg-surface text-foreground hover:border-brand-dark"
            }`}
          >
            Sản phẩm
            <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
              Seller giao sẵn nội dung (tài khoản, mã kích hoạt...)
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleProductType("SERVICE")}
            className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-bold transition ${
              productType === "SERVICE"
                ? "border-brand bg-brand text-ink"
                : "border-border-c bg-surface text-foreground hover:border-brand-dark"
            }`}
          >
            Dịch vụ
            <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
              Buyer cung cấp thông tin để seller thực hiện
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleProductType("TUT_TRICK")}
            className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-bold transition ${
              productType === "TUT_TRICK"
                ? "border-brand bg-brand text-ink"
                : "border-border-c bg-surface text-foreground hover:border-brand-dark"
            }`}
          >
            TUT-Trick
            <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
              Bán nội dung hướng dẫn, kiến thức (bán được nhiều lần)
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleProductType("TOOL")}
            className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-bold transition ${
              productType === "TOOL"
                ? "border-brand bg-brand text-ink"
                : "border-border-c bg-surface text-foreground hover:border-brand-dark"
            }`}
          >
            Tool / AI Agent
            <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
              Quy trình sử dụng + kho tài khoản tool (mã hoá)
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Ảnh sản phẩm</label>
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
            <label className="mb-1 block text-sm font-semibold text-foreground">Tên sản phẩm</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Gmail Việt Nam random full 2020-2023"
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
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
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            >
              <option value="" className="bg-surface text-foreground">
                -- Chọn danh mục --
              </option>
              {localCategories.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface text-foreground">
                  {c.name}
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
                className="mt-1.5 flex w-fit items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-dark"
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
                    className="w-full rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
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
                <p className="text-[11px] leading-relaxed text-foreground/70">
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
              <label className="mb-1 block text-sm font-semibold text-foreground">Giá (đ)</label>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 15000"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Kho</label>
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

      <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
        <p className="text-sm font-bold text-foreground">Thời gian bảo hành</p>
        <p className="text-[11px] text-muted">
          Buyer chỉ khiếu nại &ldquo;bảo hành sau giải ngân&rdquo; được trong khoảng thời gian
          này, tính từ lúc buyer xác nhận đã nhận hàng.
          {productType === "PRODUCT" &&
            ` Loại "Sản phẩm" bắt buộc tối thiểu ${MIN_WARRANTY_HOURS_PRODUCT} giờ, không áp dụng "Không bảo hành".`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            required={!noWarranty}
            disabled={noWarranty}
            value={noWarranty ? "" : warrantyValue}
            onChange={(e) => setWarrantyValue(e.target.value)}
            placeholder="VD: 7"
            className="w-24 rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none disabled:bg-surface-alt disabled:text-muted"
          />
          <select
            value={warrantyUnit}
            onChange={(e) => setWarrantyUnit(e.target.value as "hour" | "day")}
            disabled={noWarranty}
            className="rounded-lg border border-border-c bg-surface px-2.5 py-2 text-sm text-foreground focus:border-brand-dark focus:outline-none disabled:bg-surface-alt disabled:text-muted"
          >
            <option value="day">Ngày</option>
            <option value="hour">Giờ</option>
          </select>
          <label
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              productType === "PRODUCT" ? "text-muted" : "text-foreground"
            }`}
          >
            <input
              type="checkbox"
              checked={noWarranty}
              disabled={productType === "PRODUCT"}
              onChange={(e) => setNoWarranty(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Không bảo hành (bán đứt)
          </label>
        </div>
      </div>

      {(productType === "PRODUCT" || productType === "TOOL") && (
      <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-foreground">
              {productType === "TOOL" ? "Phiên bản / Gói + Kho tài khoản tool" : "Phiên bản / Gói (tuỳ chọn)"}
            </p>
            <p className="text-[11px] text-muted">
              {productType === "TOOL"
                ? "Kho dữ liệu giao hàng bên dưới sẽ TỰ ĐỘNG MÃ HOÁ trước khi lưu (mỗi buyer nhận 1 tài khoản tool riêng, không ai nhận trùng)."
                : "Chỉ điền nếu sản phẩm có nhiều loại/gói giá khác nhau. Bỏ qua nếu chỉ bán 1 loại duy nhất."}
            </p>
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm phiên bản
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
                    placeholder="Tên phiên bản (VD: Domain .US - Thuê 24h)"
                    className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                  />
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={v.price}
                    onChange={(e) => updateVariant(v.key, "price", e.target.value)}
                    placeholder="Giá (đ)"
                    className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
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
                    aria-label="Xoá phiên bản"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={v.stockItems}
                  onChange={(e) => updateVariant(v.key, "stockItems", e.target.value)}
                  rows={2}
                  placeholder="Kho dữ liệu giao hàng thật cho phiên bản này (tuỳ chọn) — mỗi dòng 1 sản phẩm sẽ giao cho khách"
                  className="mt-2 w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-[11px] bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />

                <label className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={v.hasExpiry}
                    onChange={(e) => toggleVariantExpiry(v.key, e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Lô kho này có thời hạn sử dụng (vd ChatGPT Plus, Netflix...)
                </label>
                {v.hasExpiry && (
                  <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg border border-border-c bg-surface-alt/50 p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">Gói đầy đủ:</span>
                      <select
                        value={v.nominalTermDays}
                        onChange={(e) => updateVariant(v.key, "nominalTermDays", e.target.value)}
                        className="rounded-lg border border-border-c bg-surface px-2 py-1 text-[11px] text-foreground focus:border-brand-dark focus:outline-none"
                      >
                        <option value="7">7 ngày</option>
                        <option value="30">30 ngày (1 tháng)</option>
                        <option value="60">60 ngày (2 tháng)</option>
                        <option value="90">90 ngày (3 tháng)</option>
                        <option value="180">180 ngày (6 tháng)</option>
                        <option value="365">365 ngày (12 tháng)</option>
                      </select>
                    </div>
                    <textarea
                      value={v.expiresAtItems}
                      onChange={(e) => updateVariant(v.key, "expiresAtItems", e.target.value)}
                      rows={2}
                      placeholder={
                        "Ngày hết hạn của TỪNG dòng ở ô kho phía trên, khớp đúng theo số thứ tự dòng — để trống dòng nào nếu dòng đó không có hạn, vd:\n2026-04-20\n2026-05-15"
                      }
                      className="w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-[11px] bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {variants.length === 0 && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-semibold text-foreground">
              {productType === "TOOL" ? "Kho tài khoản tool" : "Kho dữ liệu giao hàng thật (tuỳ chọn)"}
            </label>
            <textarea
              value={baseStockItems}
              onChange={(e) => setBaseStockItems(e.target.value)}
              rows={3}
              placeholder={
                productType === "TOOL"
                  ? "Mỗi dòng là 1 tài khoản tool sẽ giao TỰ ĐỘNG cho khách (sẽ được MÃ HOÁ), ví dụ:\ntool1@example.com|MatKhau123\ntool2@example.com|MatKhau456"
                  : "Mỗi dòng là 1 sản phẩm sẽ giao TỰ ĐỘNG cho khách, ví dụ:\nemail1@gmail.com|MatKhau123|MaKhoiPhuc\nemail2@gmail.com|MatKhau456|MaKhoiPhuc"
              }
              className="w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
              Có dán dữ liệu ở đây thì ô &ldquo;Kho&rdquo; phía trên sẽ tự
              động tính theo số dòng, không cần tự gõ số nữa. Bỏ trống thì
              &ldquo;Kho&rdquo; hoạt động như số đếm thông thường (chưa giao
              hàng tự động), có thể nhập kho sau tại mục &ldquo;Sản
              phẩm&rdquo; bên dưới.
            </p>

            <label className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <input
                type="checkbox"
                checked={baseHasExpiry}
                onChange={(e) => setBaseHasExpiry(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Lô kho này có thời hạn sử dụng (vd ChatGPT Plus, Netflix...)
            </label>
            {baseHasExpiry && (
              <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg border border-border-c bg-surface-alt/50 p-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-foreground">Gói đầy đủ:</span>
                  <select
                    value={baseNominalTermDays}
                    onChange={(e) => setBaseNominalTermDays(e.target.value)}
                    className="rounded-lg border border-border-c bg-surface px-2 py-1 text-[11px] text-foreground focus:border-brand-dark focus:outline-none"
                  >
                    <option value="7">7 ngày</option>
                    <option value="30">30 ngày (1 tháng)</option>
                    <option value="60">60 ngày (2 tháng)</option>
                    <option value="90">90 ngày (3 tháng)</option>
                    <option value="180">180 ngày (6 tháng)</option>
                    <option value="365">365 ngày (12 tháng)</option>
                  </select>
                </div>
                <textarea
                  value={baseExpiresAtItems}
                  onChange={(e) => setBaseExpiresAtItems(e.target.value)}
                  rows={3}
                  placeholder={
                    "Ngày hết hạn của TỪNG dòng ở ô kho phía trên, khớp đúng theo số thứ tự dòng — để trống dòng nào nếu dòng đó không có hạn, vd:\n2026-04-20\n2026-05-15"
                  }
                  className="w-full rounded-lg border border-border-c px-2.5 py-1.5 font-mono text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {productType === "TUT_TRICK" && (
        <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
          <p className="text-sm font-bold text-foreground">Nội dung hướng dẫn đầy đủ</p>
          <p className="text-[11px] text-muted">
            Quy trình / cách làm chi tiết — CHỈ hiện cho buyer SAU KHI đã mua.
            &ldquo;Mô tả chi tiết&rdquo; bên dưới vẫn công khai, dùng để giới
            thiệu bài hướng dẫn nói về gì (không lộ đáp án).
          </p>
          <textarea
            required
            minLength={20}
            maxLength={20000}
            rows={6}
            value={tutTrickContent}
            onChange={(e) => setTutTrickContent(e.target.value)}
            placeholder={"Viết đầy đủ quy trình/cách làm, ví dụ:\nBước 1: ...\nBước 2: ...\nLưu ý: ..."}
            className="mt-2 w-full rounded-lg border border-border-c px-3 py-2.5 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
        </div>
      )}

      {productType === "TOOL" && (
        <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
          <p className="text-sm font-bold text-foreground">Quy trình sử dụng đầy đủ</p>
          <p className="text-[11px] text-muted">
            Hướng dẫn cách dùng tool/AI Agent (đăng nhập, cấu hình, lưu ý) —
            CHỈ hiện cho buyer SAU KHI đã mua, cùng lúc với tài khoản tool ở
            khối &ldquo;Kho tài khoản tool&rdquo; bên trên. &ldquo;Mô tả chi
            tiết&rdquo; bên dưới vẫn công khai, dùng để giới thiệu tool làm
            được gì.
          </p>
          <textarea
            required
            minLength={20}
            maxLength={20000}
            rows={6}
            value={toolUsageGuide}
            onChange={(e) => setToolUsageGuide(e.target.value)}
            placeholder={"Viết đầy đủ quy trình sử dụng, ví dụ:\nBước 1: Đăng nhập bằng tài khoản đã nhận...\nBước 2: ...\nLưu ý: ..."}
            className="mt-2 w-full rounded-lg border border-border-c px-3 py-2.5 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />

          <div className="mt-3 border-t border-border-c pt-3">
            <p className="text-sm font-bold text-foreground">Giao file/link tool (tuỳ chọn)</p>
            <p className="text-[11px] text-muted">
              Dùng khi tool là 1 file ứng dụng hoặc link tải — có thể kết hợp
              tự do với &ldquo;Kho tài khoản tool&rdquo; ở trên (vd vừa có
              tài khoản đăng nhập vừa có file cài đặt). Cả 2 ô dưới đây đều
              CHỈ hiện cho buyer SAU KHI đã mua + bấm nhận, không lộ ra trang
              công khai.
            </p>

            <label className="mb-1 mt-2.5 block text-xs font-semibold text-foreground">
              Link tải (Google Drive, MediaFire...)
            </label>
            <input
              type="url"
              value={toolDeliveryLink}
              onChange={(e) => setToolDeliveryLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={2000}
              className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            />

            <label className="mb-1 mt-2.5 block text-xs font-semibold text-foreground">
              File tool (.zip, tối đa 20MB)
            </label>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setToolFileError(null);
                if (f && f.size > 20 * 1024 * 1024) {
                  setToolFileError("File vượt quá 20MB.");
                  setToolFile(null);
                  e.target.value = "";
                  return;
                }
                setToolFile(f);
              }}
              className="block w-full text-xs text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink hover:file:bg-brand-dark"
            />
            <p className="mt-1 text-[11px] text-foreground/70">
              Chỉ nhận .zip — nếu tool là .exe, hãy nén lại vào .zip trước
              khi tải lên (sàn không nhận file thực thi trần vì lý do an
              toàn).
            </p>
            {toolFileError && (
              <p className="mt-1 text-[11px] font-semibold text-danger">{toolFileError}</p>
            )}
          </div>
        </div>
      )}

      {productType === "SERVICE" && (
        <div className="rounded-xl border border-dashed border-border-c bg-surface-alt/50 p-3">
          <p className="text-sm font-bold text-foreground">Cấu hình dịch vụ</p>
          <p className="text-[11px] text-muted">
            Khai rõ buyer cần cung cấp gì và bạn nhận bàn giao theo cách nào —
            càng rõ ràng càng tránh tranh chấp.
          </p>

          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-bold uppercase text-foreground">
              Phương thức bàn giao chấp nhận
            </span>
            <div className="flex flex-col gap-1.5">
              {SERVICE_DELIVERY_METHODS.map((method) => (
                <label
                  key={method}
                  className="flex items-start gap-2 rounded-lg border border-border-c bg-surface p-2 text-[11px] font-semibold text-foreground"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    checked={serviceDeliveryMethods.includes(method)}
                    onChange={() => toggleServiceDeliveryMethod(method)}
                  />
                  {SERVICE_DELIVERY_METHOD_LABEL[method]}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold uppercase text-foreground">
              Cửa sổ xem thông tin nhạy cảm (giờ)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={credentialViewWindowHours}
              onChange={(e) => setCredentialViewWindowHours(e.target.value)}
              placeholder="Để trống dùng mặc định 48 giờ"
              className="w-full max-w-[220px] rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
              Thời gian bạn được xem mật khẩu/OTP buyer cung cấp, tính từ lúc
              bấm &ldquo;Nhận đơn&rdquo; — sau đó thông tin sẽ tự ẩn dù đơn
              chưa hoàn tất.
            </p>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase text-foreground">
                Thông tin buyer cần nhập
              </span>
              <button
                type="button"
                onClick={addServiceField}
                className="flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm trường
              </button>
            </div>

            {serviceFields.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {serviceFields.map((f) => (
                  <div
                    key={f.key}
                    className="grid gap-2 rounded-lg border border-border-c bg-surface p-2.5 sm:grid-cols-[1fr_180px_auto_auto]"
                  >
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={f.label}
                      onChange={(e) => updateServiceField(f.key, "label", e.target.value)}
                      placeholder="Nhãn (VD: Tài khoản Facebook)"
                      className="rounded-lg border border-border-c px-2.5 py-1.5 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                    />
                    <select
                      value={f.inputType}
                      onChange={(e) =>
                        updateServiceField(
                          f.key,
                          "inputType",
                          e.target.value as ServiceFieldInputType
                        )
                      }
                      className="rounded-lg border border-border-c bg-surface px-2 py-1.5 text-xs text-foreground focus:border-brand-dark focus:outline-none"
                    >
                      {SERVICE_FIELD_INPUT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SERVICE_FIELD_INPUT_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => updateServiceField(f.key, "required", e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                      Bắt buộc
                    </label>
                    <button
                      type="button"
                      onClick={() => removeServiceField(f.key)}
                      className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label="Xoá trường"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/70">
              Chọn loại &ldquo;Bí mật&rdquo; cho mật khẩu/OTP — hệ thống sẽ TỰ
              ĐỘNG mã hoá field này, chỉ hiện lại cho bạn sau khi &ldquo;Nhận
              đơn&rdquo; và trong đúng cửa sổ thời gian ở trên.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">Mô tả ngắn</label>
        <input
          type="text"
          required
          minLength={10}
          maxLength={200}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="1 câu ngắn hiện trên thẻ sản phẩm"
          className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">Mô tả chi tiết</label>
        <textarea
          required
          minLength={20}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"Mỗi dòng là 1 đoạn mô tả, ví dụ:\nTài khoản chính chủ, đã xác minh 2 lớp.\nBảo hành 7 ngày lỗi 1 đổi 1.\nGiao hàng tự động ngay sau khi thanh toán."}
          className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
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
