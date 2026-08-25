// Bỏ emoji/ký hiệu Unicode ở ĐẦU 1 chuỗi hiển thị — dùng cho tên danh mục
// (Category.name) khi hiển thị trong menu/danh sách điều hướng, vì 1 số
// category được admin đặt tên có kèm sẵn emoji ngay trong chuỗi name (khác
// field Category.emoji riêng) khiến menu "Dịch vụ" (header/submenu Sản
// phẩm/sidebar) hiện icon KHÔNG ĐỒNG ĐỀU — mục có emoji trong tên, mục
// không. Chỉ strip phần ĐẦU (giữ nguyên emoji nếu lỡ xuất hiện giữa/cuối tên
// — không có lý do gì xảy ra trong thực tế, nhưng an toàn hơn strip toàn
// chuỗi). KHÔNG đụng dữ liệu gốc trong DB — chỉ xử lý lúc RENDER.
//
// \p{Extended_Pictographic}: hầu hết emoji (mặt cười, biểu tượng...).
// \p{Regional_Indicator}: emoji cờ quốc gia (ghép 2 ký tự, vd 🇻🇳).
// ️: variation selector-16 (ép hiển thị dạng emoji màu, vd "▶️" =
// U+25B6 + U+FE0F). ‍: zero-width joiner (nối emoji ghép, vd "👨‍💻").
// \u{1F3FB}-\u{1F3FF}: skin tone modifier.
const LEADING_EMOJI_REGEX =
  /^[\p{Extended_Pictographic}\p{Regional_Indicator}️‍\u{1F3FB}-\u{1F3FF}\s]+/gu;

export function stripLeadingEmoji(text: string): string {
  const stripped = text.replace(LEADING_EMOJI_REGEX, "").trim();
  // Tên chỉ toàn emoji (cực hiếm) -> giữ nguyên bản gốc thay vì trả chuỗi
  // rỗng, tránh menu hiện mục không có chữ nào.
  return stripped || text.trim();
}
