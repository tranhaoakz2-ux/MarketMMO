import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const tx = await prisma.walletTransaction.findUnique({ where: { id } });
  if (!tx || tx.type !== "WITHDRAW") {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu rút tiền." }, { status: 404 });
  }
  if (tx.status !== "PENDING") {
    return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    // Tiền đã bị trừ ngay lúc seller tạo yêu cầu (xem
    // api/seller/withdraw-request/route.ts) — duyệt chỉ đổi trạng thái, KHÔNG
    // đụng số dư nữa để tránh trừ tiền 2 lần. Gate CÓ ĐIỀU KIỆN (bug B6) để 2
    // lần bấm không cùng chuyển trạng thái / đua với reject.
    const approved = await prisma.walletTransaction.updateMany({
      where: { id, type: "WITHDRAW", status: "PENDING" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    if (approved.count === 0) {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Duyệt rút tiền",
      targetType: "WalletTransaction",
      targetId: id,
      detail: `${Math.abs(tx.amount)}đ cho user ${tx.userId}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const adminNote = typeof body?.adminNote === "string" ? body.adminNote : null;
    // Từ chối phải hoàn lại đúng số tiền đã khoá. Gate NGUYÊN TỬ (bug B6): chỉ
    // khi updateMany chuyển được PENDING→REJECTED (count===1) mới hoàn ví —
    // chặn hoàn tiền 2 lần khi bấm "Từ chối" song song / đua với approve.
    const refunded = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id, type: "WITHDRAW", status: "PENDING" },
        data: { status: "REJECTED", adminNote, confirmedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: Math.abs(tx.amount) } },
      });
      return true;
    });
    if (!refunded) {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Từ chối rút tiền",
      targetType: "WalletTransaction",
      targetId: id,
      detail: adminNote ?? undefined,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
