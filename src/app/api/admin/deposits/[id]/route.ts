import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { isBankManualApprovalEnabled } from "@/lib/payment/deposit";

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
  // Lệnh ngân hàng đã tự EXPIRED (quá 15 phút, xem expireStaleBankDeposits())
  // vẫn được phép DUYỆT TAY — công tắc duyệt tay dùng đúng lúc SePay hỏng/
  // chậm, khi đó lệnh rất dễ vượt 15 phút TRƯỚC KHI admin kịp xử lý dù tiền
  // đã về thật. Chỉ nới cho "approve" + method="bank"; mọi trường hợp khác
  // (reject, method khác) vẫn đòi PENDING nghiêm ngặt như cũ.
  const isExpiredBankApproval =
    action === "approve" && tx.method === "bank" && tx.status === "EXPIRED";
  if (tx.status !== "PENDING" && !isExpiredBankApproval) {
    return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    // Chặn duyệt tay NGÂN HÀNG khi công tắc "bank_manual_approval_enabled"
    // đang TẮT (mặc định) — webhook SePay là nguồn duyệt duy nhất lúc đó,
    // tránh admin lỡ tay cộng tiền cho lệnh chưa thực sự có tiền về. KHÔNG
    // áp cho method khác (vd "usdt" — nhánh xác minh on-chain thất bại vẫn
    // luôn cần admin tự đối chiếu tay, không liên quan công tắc này).
    if (tx.method === "bank" && !(await isBankManualApprovalEnabled())) {
      return NextResponse.json(
        {
          error:
            "Duyệt tay nạp ngân hàng đang TẮT — mọi lệnh xử lý tự động qua webhook SePay. Bật công tắc ở /admin/cai-dat nếu cần duyệt tay tạm thời.",
        },
        { status: 403 }
      );
    }
    // amount TUỲ CHỌN — chỉ dùng cho các bản ghi "chờ xác minh thủ công" do
    // luồng tự động hoá USDT tạo ra khi verify on-chain thất bại (amount=0
    // lúc tạo, vì chưa biết số VNĐ đúng) — admin tự đối chiếu Tronscan rồi
    // nhập đúng số ở đây. Validate dương + nguyên; KHÔNG cho phép override
    // các yêu cầu bank/vnpay bình thường đã có amount hợp lệ theo cách âm
    // thầm đổi số — chỉ áp dụng khi override thực sự khác null/undefined.
    const amountOverride =
      body?.amount !== undefined && body?.amount !== null ? Number(body.amount) : undefined;
    if (amountOverride !== undefined && (!Number.isInteger(amountOverride) || amountOverride <= 0)) {
      return NextResponse.json({ error: "Số tiền nhập không hợp lệ." }, { status: 400 });
    }
    const creditAmount = amountOverride ?? tx.amount;

    // Gate NGUYÊN TỬ (bug B6): chỉ khi updateMany chuyển được PENDING/EXPIRED
    // →CONFIRMED (count===1) mới cộng ví — 2 lần bấm "Duyệt" song song thì chỉ
    // 1 lệnh khớp, lệnh kia count===0 (đã CONFIRMED) → không cộng lần 2. Nhận
    // cả "EXPIRED" vì nhánh isExpiredBankApproval ở trên đã cho qua guard đầu
    // hàm — chỉ method="bank" mới có thể ở trạng thái EXPIRED nên không ảnh
    // hưởng gì các method khác.
    const credited = await prisma.$transaction(async (t) => {
      const gate = await t.walletTransaction.updateMany({
        where: { id, type: "DEPOSIT", status: { in: ["PENDING", "EXPIRED"] } },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          ...(amountOverride !== undefined ? { amount: amountOverride } : {}),
        },
      });
      if (gate.count === 0) return false;
      await t.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: creditAmount } },
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
      detail: `+${creditAmount}đ cho user ${tx.userId} (method=${tx.method ?? "?"})${amountOverride !== undefined ? ", admin nhập tay" : ""}${isExpiredBankApproval ? ", duyệt tay khi công tắc đang BẬT (lệnh đã hết hạn)" : ""}`,
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
