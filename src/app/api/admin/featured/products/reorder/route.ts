import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// Body: { order: string[] } — DANH SÁCH ĐẦY ĐỦ id sản phẩm đang ghim, theo
// đúng thứ tự mới sau khi admin kéo-thả ở /admin/noi-bat. Gán lại
// featuredOrder = vị trí trong mảng (0,1,2,...) cho từng id trong 1
// transaction — validate toàn bộ id phải đang isFeatured=true, tránh admin
// gửi nhầm id sản phẩm chưa ghim (vd do race với tab khác vừa bỏ ghim).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const order = body?.order;
  if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const featured = await prisma.product.findMany({
    where: { isFeatured: true },
    select: { id: true },
  });
  const featuredIds = new Set(featured.map((p) => p.id));
  if (order.length !== featuredIds.size || order.some((id: string) => !featuredIds.has(id))) {
    return NextResponse.json(
      { error: "Danh sách không khớp — có thể đã có thay đổi từ nơi khác, vui lòng tải lại." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((id: string, index: number) =>
      prisma.product.update({ where: { id }, data: { featuredOrder: index } })
    )
  );

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sắp lại thứ tự sản phẩm nổi bật",
    targetType: "Product",
    detail: `${order.length} sản phẩm`,
  });

  return NextResponse.json({ ok: true });
}
