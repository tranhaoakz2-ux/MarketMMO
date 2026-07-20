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
  if (!tx || tx.type !== "DEPOSIT") {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu nạp tiền." }, { status: 404 });
  }
  if (tx.status !== "PENDING") {
    return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    // Gate NGUYÊN TỬ (bug B6): chỉ khi updateMany chuyển được PENDING→CONFIRMED
    // (count===1) mới cộng ví — 2 lần bấm "Duyệt" song song thì chỉ 1 lệnh
    // khớp, lệnh kia count===0 (đã CONFIRMED) → không cộng lần 2.
    const credited = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id, type: "DEPOSIT", status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: tx.amount } },
      });
      return true;
    });
    if (!credited) {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Duyệt nạp tiền",
      targetType: "WalletTransaction",
      targetId: id,
      detail: `+${tx.amount}đ cho user ${tx.userId}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const adminNote = typeof body?.adminNote === "string" ? body.adminNote : null;
    // Chỉ từ chối được yêu cầu CÒN PENDING (bug B6): tránh đua với "approve"
    // — nếu đã CONFIRMED (đã cộng ví) thì không được đè thành REJECTED.
    const rejected = await prisma.walletTransaction.updateMany({
      where: { id, type: "DEPOSIT", status: "PENDING" },
      data: { status: "REJECTED", adminNote, confirmedAt: new Date() },
    });
    if (rejected.count === 0) {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Từ chối nạp tiền",
      targetType: "WalletTransaction",
      targetId: id,
      detail: adminNote ?? undefined,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
