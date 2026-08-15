import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { releaseDueEscrow } from "@/lib/escrow";
import { closeDueAuctionSessions } from "@/lib/auction";

// Cron DUY NHẤT/ngày (gộp escrow + đấu giá để không vượt giới hạn 2 cron của
// gói Vercel Hobby) — cấu hình lịch chạy trong vercel.json ("crons"), bảo vệ
// bằng header Authorization: Bearer <CRON_SECRET> (Vercel tự đính kèm header
// này nếu biến môi trường CRON_SECRET đã được set trên project — thiếu biến
// hoặc sai giá trị → 401, fail-closed).
//
// Mỗi lần chạy: LUÔN giải ngân escrow đến hạn (đúng logic route admin bấm
// tay, chỉ khác actor SYSTEM thay vì ADMIN). Chốt phiên đấu giá gọi
// closeDueAuctionSessions() KHÔNG cần điều kiện "hôm nay có phải Chủ Nhật
// không" riêng — hàm đó tự lọc theo AuctionSession.windowEnd<=now, chỉ có
// dòng nào cần xử lý khi thật sự đã qua 22:00 tối Chủ Nhật (self-limiting),
// gọi mỗi ngày chỉ tốn 1 query rỗng vào 6/7 ngày còn lại trong tuần.
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET chưa được cấu hình." }, { status: 401 });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 401 });
  }

  const [{ released }, { sessionsClosed }] = await Promise.all([
    releaseDueEscrow({ type: "SYSTEM" }),
    closeDueAuctionSessions(),
  ]);

  return NextResponse.json({ released, sessionsClosed });
}
