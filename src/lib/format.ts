export function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
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
