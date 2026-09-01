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

// Buyer TỰ HUỶ 1 lệnh nạp DV.net đang PENDING (đổi ý, hoặc tạo nhầm) — CHỈ
// đổi status sang CANCELLED, KHÔNG xoá record (giữ dấu vết + để webhook
// DV.net vẫn khớp lại được nếu tiền thật sự về sau đó, xem POST
// /api/webhook/dvnet — webhook đó CỐ Ý không loại trừ CANCELLED khỏi điều
// kiện khớp, không được bỏ rơi tiền). CHỈ áp dụng cho lệnh DV.net
// (method="dvnet") — nạp ngân hàng dùng luồng riêng, buyer không tự huỷ được
// (chỉ tự hết hạn sau 15 phút qua expireStaleBankDeposits()).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const tx = await prisma.walletTransaction.findUnique({
    where: { id },
    select: { userId: true, type: true, method: true, status: true },
  });

  if (!tx || tx.type !== "DEPOSIT" || tx.userId !== session!.user.id) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu nạp tiền." }, { status: 404 });
  }
  if (tx.method !== "dvnet") {
    return NextResponse.json({ error: "Chỉ huỷ được lệnh nạp qua DV.net." }, { status: 400 });
  }
  if (tx.status !== "PENDING") {
    return NextResponse.json(
      {
        error:
          tx.status === "CONFIRMED"
            ? "Lệnh đã nạp tiền thành công, không thể huỷ."
            : "Lệnh không còn ở trạng thái chờ, không thể huỷ.",
      },
      { status: 400 }
    );
  }

  // updateMany CÓ ĐIỀU KIỆN status="PENDING" — chặn race: nếu đúng lúc này
  // webhook DV.net vừa cộng tiền xong (status vừa đổi CONFIRMED), request
  // huỷ tới sau sẽ KHÔNG huỷ nhầm 1 lệnh đã có tiền thật.
  const result = await prisma.walletTransaction.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Lệnh vừa đổi trạng thái, không thể huỷ." }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
