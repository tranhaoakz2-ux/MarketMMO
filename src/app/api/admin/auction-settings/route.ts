import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { getAuctionSetting } from "@/lib/auction";
import { AUCTION_SETTING_ID } from "@/lib/constants";

// GET/PATCH cấu hình đấu giá vị trí vàng (N vị trí + giá sàn) — cùng pattern
// PlatformFeeSetting (src/app/api/admin/platform-fee/route.ts).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const setting = await getAuctionSetting();
  return NextResponse.json({
    slotCount: setting.slotCount,
    floorPrice: setting.floorPrice,
    updatedAt: setting.updatedAt,
  });
}

export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slotCount = Number(body?.slotCount);
  const floorPrice = Number(body?.floorPrice);

  if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 50) {
    return NextResponse.json({ error: "Số vị trí vàng không hợp lệ (1–50)." }, { status: 400 });
  }
  if (!Number.isInteger(floorPrice) || floorPrice < 0) {
    return NextResponse.json({ error: "Giá sàn không hợp lệ." }, { status: 400 });
  }

  const current = await getAuctionSetting();
  await prisma.auctionSetting.update({
    where: { id: AUCTION_SETTING_ID },
    data: { slotCount, floorPrice, updatedById: session!.user!.id },
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Đổi cấu hình đấu giá vị trí vàng",
    targetType: "AuctionSetting",
    detail: `Số vị trí: ${current.slotCount} → ${slotCount}; Giá sàn: ${current.floorPrice}đ → ${floorPrice}đ`,
  });

  return NextResponse.json({ ok: true });
}
