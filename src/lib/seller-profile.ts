// Mức hoàn thiện "Hồ sơ cá nhân" seller — chỉ tính trên 2 tín hiệu THẬT SỰ
// tuỳ chọn (avatarUrl, specialty). shopName/description luôn có giá trị
// (bắt buộc/tự điền mặc định lúc đăng ký) nên không đưa vào công thức, tránh
// hiện % giả cho phần vốn đã luôn "hoàn thành". Chỉ dùng nội bộ cho seller
// (trang Hồ sơ cá nhân + Tổng quan) — KHÔNG hiện ở gian hàng công khai.
export function calcSellerProfileCompleteness(seller: {
  avatarUrl: string | null;
  specialty: string | null;
}): number {
  const total = 2;
  let filled = 0;
  if (seller.avatarUrl) filled += 1;
  if (seller.specialty && seller.specialty.trim().length > 0) filled += 1;
  return Math.round((filled / total) * 100);
}

export const SELLER_SHOP_NAME_MAX_LENGTH = 60;
export const SELLER_DESCRIPTION_MAX_LENGTH = 1000;
export const SELLER_SPECIALTY_MAX_LENGTH = 200;
