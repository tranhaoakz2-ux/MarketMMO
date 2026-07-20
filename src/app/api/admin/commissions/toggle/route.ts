import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getCommissionSetting } from "@/lib/commission";
import { COMMISSION_SETTING_ID } from "@/lib/constants";

// Kill switch (mục #9B): bật/tắt TOÀN BỘ tính năng hoa hồng.
//   - TẮT: ngừng phát sinh hoa hồng MỚI kể từ thời điểm tắt (accrueCommission
//     kiểm cờ này). KHÔNG đụng khoản đã kiếm hợp lệ (vẫn ELIGIBLE/PAID/giải
//     ngân được bình thường).
//   - BẬT lại: chỉ áp cho hoa hồng phát sinh SAU, không hồi tố khoảng đã tắt.
// Lưu DB (không env), audit log. CHỈ admin (requireAdmin ở đây).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Thiếu trạng thái bật/tắt." }, { status: 400 });
  }

  await getCommissionSetting(); // đảm bảo singleton tồn tại
  await prisma.commissionSetting.update({
    where: { id: COMMISSION_SETTING_ID },
    data: { enabled: body.enabled, updatedById: session!.user!.id },
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: body.enabled ? "Bật tính năng hoa hồng" : "Tắt tính năng hoa hồng",
    targetType: "CommissionSetting",
    detail: body.enabled ? "Kill switch: BẬT (phát sinh hoa hồng mới)" : "Kill switch: TẮT (ngừng phát sinh mới, giữ khoản đã kiếm)",
  });

  return NextResponse.json({ ok: true, enabled: body.enabled });
}
