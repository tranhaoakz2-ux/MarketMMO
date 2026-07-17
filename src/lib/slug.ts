export function slugifySeller(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Dùng chung cho slug sản phẩm — cùng quy tắc đơn giản với slugifySeller (không tự strip dấu tiếng Việt, giữ nguyên quy ước sẵn có của dự án). */
export function slugifyProduct(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}
