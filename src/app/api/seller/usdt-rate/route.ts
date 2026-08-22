import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { getUsdtWithdrawRate } from "@/lib/payment/exchange-rate";

// Tỷ giá xem trước cho seller khi nhập số tiền rút USDT — CHỈ để hiển thị
// (không khoá gì cả). Tỷ giá THẬT SỰ dùng để tính tiền được server tự lấy
// LẠI (độc lập, không tin giá client gửi lên) ngay trong
// POST /api/seller/withdraw-request lúc tạo yêu cầu — dùng CÙNG hàm
// getUsdtWithdrawRate() (đã áp biên sàn) nên số xem trước ở đây LUÔN khớp
// đúng số route đó sẽ tính, không lệch.
export async function GET() {
  const { error } = await requireSeller();
  if (error) return error;

  try {
    const { rate, baseSource: source } = await getUsdtWithdrawRate();
    return NextResponse.json({ rate, source });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể lấy tỷ giá.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
