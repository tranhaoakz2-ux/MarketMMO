// Bỏ dấu tiếng Việt cho slug URL (KHÁC slugifyFieldKey bên dưới — dùng gạch
// NGANG "-" thay vì gạch dưới "_", vì đây là slug hiển thị trên URL, không
// phải key JSON). NFD normalize tách được mọi nguyên âm có dấu (á, ọ, ư...)
// thành ký tự gốc + dấu phụ rời, chỉ riêng "đ" không tách được bằng NFD
// (không phải "d" + dấu phụ) nên xử lý tay. Sau đó hạ chữ thường, thay mọi
// ký tự không phải a-z0-9 bằng gạch ngang, gộp gạch ngang liên tiếp, cắt
// gạch ngang ở đầu/cuối — đảm bảo slug LUÔN chỉ gồm a-z0-9- (an toàn khi đưa
// vào URL, không bị lỗi 404 do trình duyệt percent-encode rồi Next.js không
// tự decode lại route param — xem investigation khi sửa bug danh mục có dấu
// bị 404, 2026-07-31).
function toAsciiSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slug gian hàng người bán — GIỮ NGUYÊN hành vi cũ (không strip dấu), KHÔNG
// sửa cùng lúc với danh mục/sản phẩm dù có cùng dạng lỗi tiềm ẩn: trang chi
// tiết sản phẩm (san-pham/[slug]/page.tsx) TỰ TÍNH LẠI slug gian hàng từ
// product.seller (tên) mỗi lần render thay vì đọc Seller.slug đã lưu — đổi
// thuật toán ở đây mà không đồng thời sửa cách tính lại đó sẽ làm link "Xem
// Shop" của seller có tên tiếng Việt ĐANG hoạt động (slug cũ đã lưu trong DB
// từ lúc đăng ký) trỏ sai sang slug mới không tồn tại. Cần xử lý riêng nếu
// muốn sửa — ngoài phạm vi lần sửa bug danh mục/sản phẩm 404 này.
export function slugifySeller(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/** Dùng chung cho slug sản phẩm — bỏ dấu tiếng Việt, chỉ còn a-z0-9- (xem toAsciiSlug ở trên). */
export function slugifyProduct(name: string): string {
  return toAsciiSlug(name);
}

/** Dùng cho slug danh mục (cả admin tạo lẫn seller tự đề xuất) — bỏ dấu tiếng Việt, chỉ còn a-z0-9-. */
export function slugifyCategory(name: string): string {
  return toAsciiSlug(name);
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
