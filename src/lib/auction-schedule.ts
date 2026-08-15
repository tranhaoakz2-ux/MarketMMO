// Khung giờ đấu giá vị trí vàng: 20:00–22:00 TỐI CHỦ NHẬT, giờ Việt Nam
// (Asia/Ho_Chi_Minh). Đây là logic THẬT quyết định mở/đóng nhận bid — KHÔNG
// phụ thuộc giờ cron chạy (Vercel Cron có thể lệch vài phút/giờ) — mọi request
// đặt giá tự tính lại "bây giờ có nằm trong khung giờ này không" độc lập.
//
// Việt Nam KHÔNG có giờ mùa hè (DST) — offset UTC+7 cố định quanh năm — nên
// quy đổi "ngày-giờ theo múi VN" → UTC chỉ cần cộng/trừ 7 tiếng, không cần
// thêm thư viện timezone. Intl.DateTimeFormat (built-in) chỉ dùng để ĐỌC
// đúng ngày-giờ VN từ 1 mốc UTC (view), không dùng để parse ngược.

const AUCTION_TZ = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const AUCTION_WINDOW_START_HOUR = 20;
export const AUCTION_WINDOW_END_HOUR = 22;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Đọc year/month/day/weekday/hour theo giờ VN của 1 mốc UTC bất kỳ.
function vnParts(date: Date): { year: number; month: number; day: number; weekday: number; hour: number } {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: AUCTION_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = dateFmt.format(date).split("-").map(Number);

  const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: AUCTION_TZ, weekday: "short" });
  const weekday = WEEKDAY_INDEX[weekdayFmt.format(date)] ?? 0;

  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: AUCTION_TZ,
    hour: "2-digit",
    hour12: false,
  });
  // Một số engine ICU trả "24" cho nửa đêm khi hour12:false — quy về 0.
  const rawHour = Number(hourFmt.format(date).replace(/\D/g, ""));
  const hour = rawHour === 24 ? 0 : rawHour;

  return { year, month, day, weekday, hour };
}

// UTC Date tương ứng "YYYY-MM-DD HH:00:00" theo giờ VN (offset cố định +7).
function vnWallClockToUtc(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0) - VN_OFFSET_MS);
}

export function isWithinAuctionWindow(date: Date = new Date()): boolean {
  const p = vnParts(date);
  return p.weekday === 0 && p.hour >= AUCTION_WINDOW_START_HOUR && p.hour < AUCTION_WINDOW_END_HOUR;
}

// Khung 20:00–22:00 CN (mốc UTC) của TUẦN CHỨA `referenceDate` (theo lịch
// VN) — dùng cho cả trường hợp referenceDate rơi đúng Chủ Nhật lẫn các ngày
// khác trong tuần (lùi về đúng Chủ Nhật gần nhất trước đó).
export function getAuctionWindowFor(referenceDate: Date = new Date()): { windowStart: Date; windowEnd: Date } {
  const p = vnParts(referenceDate);
  // Lùi `weekday` ngày theo lịch VN để ra đúng Chủ Nhật của tuần đó — dùng
  // Date.UTC thuần cho phép toán ngày (không liên quan giờ/offset, chỉ cần
  // đúng năm-tháng-ngày dương lịch).
  const sunday = new Date(Date.UTC(p.year, p.month - 1, p.day) - p.weekday * 24 * 60 * 60 * 1000);
  const sy = sunday.getUTCFullYear();
  const sm = sunday.getUTCMonth() + 1;
  const sd = sunday.getUTCDate();
  return {
    windowStart: vnWallClockToUtc(sy, sm, sd, AUCTION_WINDOW_START_HOUR),
    windowEnd: vnWallClockToUtc(sy, sm, sd, AUCTION_WINDOW_END_HOUR),
  };
}

// Mốc bắt đầu phiên Chủ Nhật KẾ TIẾP — cộng đúng 7 ngày lên windowStart hiện
// tại. An toàn vì VN không có DST (không có mốc "nhảy giờ" nào lệch lịch).
export function getNextWindowStart(currentWindowStart: Date): Date {
  return new Date(currentWindowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}
