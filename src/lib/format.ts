export function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

// Khác formatLastActive() (chỉ dùng cho "online X trước" của User) — hàm
// này generic cho mốc thời gian bất kỳ (đơn hàng, thông báo...), không có
// tiền tố "Online".
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

// Khác formatRelativeTime()/formatLastActive() (đếm LÙI về quá khứ) — hàm
// này đếm TỚI một mốc trong TƯƠNG LAI, dùng cho hạn dùng sản phẩm có thời
// hạn (xem ProductStockItem.expiresAt / OrderItem.deliveredExpiresAt).
// `tone` để nơi gọi tự map sang class màu cảnh báo phù hợp (vd text-danger).
export function formatDaysRemaining(
  expiresAt: Date | string
): { label: string; tone: "danger" | "warn" | "safe" } {
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const diffDays = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const dateLabel = d.toLocaleDateString("vi-VN");
  if (diffDays <= 0) return { label: `Đã hết hạn (${dateLabel})`, tone: "danger" };
  if (diffDays <= 2) return { label: `Hạn dùng đến ${dateLabel} (còn ${diffDays} ngày)`, tone: "danger" };
  if (diffDays <= 7) return { label: `Hạn dùng đến ${dateLabel} (còn ${diffDays} ngày)`, tone: "warn" };
  return { label: `Hạn dùng đến ${dateLabel} (còn ${diffDays} ngày)`, tone: "safe" };
}

export function formatLastActive(date: Date | string | null | undefined): string {
  if (!date) return "Chưa hoạt động";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 5) return "Đang online";
  if (diffMin < 60) return `Online ${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Online ${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `Online ${diffDay} ngày trước`;
}
