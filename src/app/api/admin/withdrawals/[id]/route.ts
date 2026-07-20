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
    // đụng số dư nữa để tránh trừ tiền 2 lần.
    await prisma.walletTransaction.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
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
    // Từ chối phải hoàn lại đúng số tiền đã bị khoá lúc tạo yêu cầu.
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id },
        data: { status: "REJECTED", adminNote, confirmedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: Math.abs(tx.amount) } },
      }),
    ]);
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
