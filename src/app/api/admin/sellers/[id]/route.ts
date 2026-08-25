import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { computeSellerLevelMetrics, getSellerLevelConfigs, getSellerLevelSetting, qualifiedLevelFor } from "@/lib/seller-level";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) {
    return NextResponse.json({ error: "Không tìm thấy gian hàng." }, { status: 404 });
  }

  if (action === "suspend") {
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : null;
    await prisma.seller.update({
      where: { id },
      data: { suspended: true, suspendedReason: reason, suspendedAt: new Date() },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Khoá gian hàng",
      targetType: "Seller",
      targetId: id,
      detail: `${seller.shopName}${reason ? ` — ${reason}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuspend") {
    await prisma.seller.update({
      where: { id },
      data: { suspended: false, suspendedReason: null, suspendedAt: null },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Mở khoá gian hàng",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  // Bật/tắt badge "Đã xác thực" thủ công — không còn quy trình duyệt giấy
  // tờ nào đứng sau (xem comment field Seller.verified trong schema.prisma).
  if (action === "verify") {
    await prisma.seller.update({ where: { id }, data: { verified: true } });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Đánh dấu gian hàng đã xác thực",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unverify") {
    await prisma.seller.update({ where: { id }, data: { verified: false } });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Bỏ đánh dấu gian hàng đã xác thực",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  // Ghim/bỏ ghim "Các Seller Nổi Bật" trang chủ — ghim mới tự gán
  // featuredOrder = lớn nhất hiện có + 1 (thêm vào CUỐI, admin sắp lại thứ
  // tự sau ở /admin/noi-bat nếu muốn); bỏ ghim xoá featuredOrder.
  if (action === "feature") {
    const maxOrder = await prisma.seller.aggregate({
      where: { isFeatured: true },
      _max: { featuredOrder: true },
    });
    await prisma.seller.update({
      where: { id },
      data: { isFeatured: true, featuredOrder: (maxOrder._max.featuredOrder ?? -1) + 1 },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Ghim seller nổi bật",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unfeature") {
    await prisma.seller.update({ where: { id }, data: { isFeatured: false, featuredOrder: null } });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Bỏ ghim seller nổi bật",
      targetType: "Seller",
      targetId: id,
      detail: seller.shopName,
    });
    return NextResponse.json({ ok: true });
  }

  // Admin ghi đè/khoá hạng — recomputeSellerLevel() sẽ bỏ qua hoàn toàn seller
  // này (xem src/lib/seller-level.ts) cho tới khi gỡ khoá. Ghi SellerLevelHistory
  // để đối chiếu sau này (KHÔNG dùng AdminAuditLog — cần đứng chung dòng thời
  // gian với các lần đổi hạng tự động).
  if (action === "set_level_override") {
    const newLevel = Number(body?.level);
    if (!Number.isInteger(newLevel) || newLevel < 1 || newLevel > 5) {
      return NextResponse.json({ error: "Hạng ghi đè không hợp lệ (1-5)." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.seller.update({
        where: { id },
        data: {
          level: newLevel,
          levelOverride: newLevel,
          levelDowngradePendingTo: null,
          levelDowngradePendingSince: null,
        },
      }),
      prisma.sellerLevelHistory.create({
        data: {
          sellerId: id,
          fromLevel: seller.level,
          toLevel: newLevel,
          reason: "admin-override",
          actorType: "ADMIN",
          actorId: session!.user!.id,
        },
      }),
    ]);
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Ghi đè/khoá hạng người bán",
      targetType: "Seller",
      targetId: id,
      detail: `${seller.shopName}: LV${seller.level} → LV${newLevel} (khoá)`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear_level_override") {
    if (seller.levelOverride === null) {
      return NextResponse.json({ error: "Gian hàng này không bị khoá hạng." }, { status: 400 });
    }
    // Gỡ khoá phải phản ánh ĐÚNG dữ liệu thật NGAY LẬP TỨC — không đi qua cơ
    // chế "chờ downgradeGraceDays" của recomputeSellerLevel() (cơ chế đó chỉ
    // dành cho biến động ngắn hạn trong lúc vận hành tự động, KHÔNG hợp cho
    // trường hợp này: giá trị admin từng ép có thể lệch xa dữ liệu thật —
    // seller không nên "được giữ" hạng ép cũ thêm nhiều ngày sau khi admin đã
    // chủ động gỡ khoá). Tính lại TRỰC TIẾP bằng đúng logic
    // computeSellerLevelMetrics()/qualifiedLevelFor() (cùng hàm sweepAllSellerLevels()
    // dùng), áp dụng ngay cả 2 chiều tăng/giảm — cùng nguyên tắc
    // scripts/backfill-seller-levels.ts.
    const [configs, setting] = await Promise.all([getSellerLevelConfigs(), getSellerLevelSetting()]);
    const metrics = await computeSellerLevelMetrics(
      prisma,
      id,
      seller.userId,
      setting.disputeRateWindowDays,
      setting.disputePartialWeight
    );
    const qualifiedLevel = qualifiedLevelFor(metrics, configs);
    await prisma.$transaction([
      prisma.seller.update({
        where: { id },
        data: {
          level: qualifiedLevel,
          levelOverride: null,
          levelDowngradePendingTo: null,
          levelDowngradePendingSince: null,
          levelRecomputedAt: new Date(),
        },
      }),
      prisma.sellerLevelHistory.create({
        data: {
          sellerId: id,
          fromLevel: seller.level,
          toLevel: qualifiedLevel,
          reason: "admin-clear-override",
          actorType: "ADMIN",
          actorId: session!.user!.id,
          metricsSnapshot: JSON.stringify(metrics),
        },
      }),
    ]);
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Gỡ khoá hạng người bán",
      targetType: "Seller",
      targetId: id,
      detail: `${seller.shopName}: LV${seller.level} (đã khoá) → LV${qualifiedLevel} (tính lại từ dữ liệu thật)`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
