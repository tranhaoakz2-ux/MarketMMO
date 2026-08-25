import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { expireStaleBankDeposits } from "@/lib/payment/deposit";

// Buyer poll trạng thái 1 yêu cầu nạp tiền (mỗi 3-5s, xem DepositPanel.tsx)
// trong lúc chờ webhook SePay khớp giao dịch — để trang tự chuyển "Nạp
// thành công" mà không cần F5. Chỉ trả về đúng chủ sở hữu, không lộ deposit
// của người khác dù đoán được id (cuid không đoán được, nhưng vẫn check
// tường minh — cùng nguyên tắc requireUser() + so userId ở mọi route khác).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  // Lazy sweep: nếu ĐÚNG lệnh này đang PENDING quá hạn, chuyển EXPIRED ngay
  // trước khi đọc — buyer poll mỗi 4s nên thấy "hết hạn" gần như tức thời,
  // không cần đợi cron. Quét TOÀN CỤC (không chỉ id này) vì chi phí rẻ (1
  // updateMany có index) và tiện làm sạch luôn các lệnh cũ khác không ai poll.
  await expireStaleBankDeposits();

  const tx = await prisma.walletTransaction.findUnique({
    where: { id },
    select: { userId: true, type: true, status: true, amount: true, method: true },
  });

  if (!tx || tx.type !== "DEPOSIT" || tx.userId !== session!.user.id) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu nạp tiền." }, { status: 404 });
  }

  return NextResponse.json({ status: tx.status, amount: tx.amount, method: tx.method });
}
