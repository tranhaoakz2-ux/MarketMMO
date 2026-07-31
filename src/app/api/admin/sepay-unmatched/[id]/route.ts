import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// Admin xử lý tay 1 giao dịch SePay không khớp được mã đơn tự động:
//  - "assign": chọn đúng buyer đã chuyển khoản này (admin tự xác minh ngoài
//    hệ thống, vd hỏi buyer/đối chiếu tên trên sao kê) -> tạo WalletTransaction
//    CONFIRMED + cộng ví NGAY bằng đúng transferAmount đã lưu (số tiền THẬT
//    từ webhook, không phải số ai đó tự khai).
//  - "ignore": xác nhận đây không phải tiền nạp (vd chuyển nhầm, giao dịch
//    nội bộ khác) -> đóng lại, không đụng ví ai.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const row = await prisma.sepayUnmatchedTransaction.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch." }, { status: 404 });
  }
  if (row.status !== "UNMATCHED") {
    return NextResponse.json({ error: "Giao dịch này đã được xử lý." }, { status: 400 });
  }

  if (action === "ignore") {
    const closed = await prisma.sepayUnmatchedTransaction.updateMany({
      where: { id, status: "UNMATCHED" },
      data: { status: "IGNORED", resolvedAt: new Date() },
    });
    if (closed.count === 0) {
      return NextResponse.json({ error: "Giao dịch này đã được xử lý." }, { status: 400 });
    }
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Bỏ qua giao dịch SePay chưa khớp",
      targetType: "SepayUnmatchedTransaction",
      targetId: id,
      detail: `${row.amount}đ, sepayId ${row.sepayId}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "assign") {
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) {
      return NextResponse.json({ error: "Vui lòng chọn người dùng." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 400 });
    }

    try {
      const walletTx = await prisma.$transaction(async (t) => {
        // Gate NGUYÊN TỬ — 2 admin cùng bấm "Gán" cho cùng 1 giao dịch song
        // song thì chỉ 1 lệnh khớp, tránh cộng ví 2 lần.
        const gate = await t.sepayUnmatchedTransaction.updateMany({
          where: { id, status: "UNMATCHED" },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
        if (gate.count === 0) return null;

        const tx = await t.walletTransaction.create({
          data: {
            userId,
            type: "DEPOSIT",
            amount: row.amount,
            status: "CONFIRMED",
            method: "sepay",
            gatewayRef: row.sepayId,
            note: `Admin gán tay giao dịch SePay không tự khớp được mã đơn (nội dung gốc: ${row.content ?? "—"})`,
            confirmedAt: new Date(),
          },
        });
        await t.user.update({ where: { id: userId }, data: { walletBalance: { increment: row.amount } } });
        await t.sepayUnmatchedTransaction.update({
          where: { id },
          data: { resolvedWalletTransactionId: tx.id },
        });
        return tx;
      });

      if (!walletTx) {
        return NextResponse.json({ error: "Giao dịch này đã được xử lý." }, { status: 400 });
      }

      await logAdminAction({
        adminId: session!.user!.id,
        action: "Gán giao dịch SePay chưa khớp cho user",
        targetType: "SepayUnmatchedTransaction",
        targetId: id,
        detail: `+${row.amount}đ cho user ${userId}`,
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return NextResponse.json(
          { error: "Giao dịch này đã được xử lý ở nơi khác trước đó." },
          { status: 400 }
        );
      }
      throw err;
    }
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
