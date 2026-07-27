export function slugifySeller(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Dùng chung cho slug sản phẩm — cùng quy tắc đơn giản với slugifySeller (không tự strip dấu tiếng Việt, giữ nguyên quy ước sẵn có của dự án). */
export function slugifyProduct(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Dùng cho slug danh mục do seller tự đề xuất — cùng quy tắc với slugifyProduct/slugifySeller. */
export function slugifyCategory(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

// Dùng làm KEY trong JSON (ServiceFieldDefinition.fieldKey — khoá cho
// ServiceIntake.publicFields/encryptedFields) — khác 3 hàm slugify* ở trên
// (chỉ đổi dấu cách thành gạch ngang, giữ nguyên dấu tiếng Việt vì chỉ dùng
// làm slug URL hiển thị): field key cần an toàn làm định danh (không dấu,
// gạch dưới) nên phải strip dấu tiếng Việt + loại ký tự đặc biệt.
export function slugifyFieldKey(label: string, existingKeys: Set<string> = new Set()): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";

  if (!existingKeys.has(base)) return base;
  let i = 2;
  while (existingKeys.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
