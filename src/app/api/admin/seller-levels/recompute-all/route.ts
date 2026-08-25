import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAdminAction } from "@/lib/audit";
import { sweepAllSellerLevels } from "@/lib/seller-level";

// POST: nút admin "Tính lại toàn bộ" — chạy đúng hàm cron hàng ngày dùng
// (sweepAllSellerLevels), không phải bản riêng — tránh 2 nguồn logic lệch
// nhau giữa cron và nút bấm tay.
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { processed } = await sweepAllSellerLevels();

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Tính lại hạng toàn bộ người bán",
    targetType: "SellerLevelSetting",
    detail: `${processed} seller`,
  });

  return NextResponse.json({ ok: true, processed });
}
