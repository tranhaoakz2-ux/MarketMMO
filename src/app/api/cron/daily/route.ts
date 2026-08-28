import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { releaseDueEscrow } from "@/lib/escrow";
import { closeDueAuctionSessions } from "@/lib/auction";
import { refundOverdueManualProvisionItems } from "@/lib/manual-provision";
import { deleteStaleRejectedDeposits, expireStaleBankDeposits } from "@/lib/payment/deposit";
import { sweepAllSellerLevels } from "@/lib/seller-level";

// Cron DUY NHẤT/ngày (gộp escrow + đấu giá để không vượt giới hạn 2 cron của
// gói Vercel Hobby) — cấu hình lịch chạy trong vercel.json ("crons"), bảo vệ
// bằng header Authorization: Bearer <CRON_SECRET> (Vercel tự đính kèm header
// này nếu biến môi trường CRON_SECRET đã được set trên project — thiếu biến
// hoặc sai giá trị → 401, fail-closed).
//
// PHẢI là GET, không phải POST: Vercel Cron Jobs luôn gọi endpoint bằng
// HTTP GET (không cấu hình được method khác) — route trước đây chỉ export
// POST nên Next.js tự trả 405 Method Not Allowed cho mọi lần Vercel Cron
// gọi thật, cron không bao giờ chạy được dù CRON_SECRET đã đúng.
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

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET chưa được cấu hình." }, { status: 401 });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStr(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 401 });
  }

  const [
    { released },
    { sessionsClosed },
    { refunded: manualProvisionRefunded },
    bankDepositsExpired,
    { processed: sellerLevelsProcessed },
    staleDepositsDeleted,
  ] = await Promise.all([
    releaseDueEscrow({ type: "SYSTEM" }),
    closeDueAuctionSessions(),
    // Đơn giao thủ công (VPS/Server) seller không nhập credential đúng hạn —
    // tự huỷ + hoàn 100% cho buyer, xem src/lib/manual-provision.ts.
    refundOverdueManualProvisionItems({ type: "SYSTEM" }),
    // Lưới an toàn cho lệnh nạp ngân hàng quá hạn — bản thân đã được quét
    // LƯỜI ở GET /api/wallet/deposit/[id] và GET /api/admin/deposits (gần
    // như tức thời), đây chỉ vét những lệnh không ai đọc trạng thái tới
    // (buyer đóng tab luôn). Chỉ đổi status, KHÔNG đụng walletBalance.
    expireStaleBankDeposits(),
    // Lưới an toàn cho Hạng người bán — bản thân đã tính lại NGAY mỗi lần có
    // sự kiện thật (giải ngân/khiếu nại xử lý xong/review mới), đây chỉ vét
    // các trường hợp KHÔNG có sự kiện nào kích hoạt (vd đang "chờ tụt hạng"
    // đã đủ downgradeGraceDays nhưng seller không có hoạt động mới nào để tự
    // trigger). KHÔNG đụng WalletTransaction/escrow — chỉ Seller.level +
    // các bảng SellerLevel*.
    sweepAllSellerLevels(),
    // Dọn lịch sử: xoá HẲN các lệnh nạp EXPIRED/REJECTED đã đủ
    // STALE_DEPOSIT_RETENTION_HOURS (24h) — CHỈ đơn CHƯA từng có tiền thật về,
    // không bao giờ đụng CONFIRMED. Xem giải thích an toàn đầy đủ (vì sao
    // không ảnh hưởng khớp webhook SePay trễ hạn) trong
    // src/lib/payment/deposit.ts.
    deleteStaleRejectedDeposits(),
  ]);

  return NextResponse.json({
    released,
    sessionsClosed,
    manualProvisionRefunded,
    bankDepositsExpired,
    sellerLevelsProcessed,
    staleDepositsDeleted,
  });
}
