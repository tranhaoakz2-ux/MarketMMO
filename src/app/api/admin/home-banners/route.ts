import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const VALID_SLOTS = ["LARGE", "SMALL_1", "SMALL_2"];

// GET — TOÀN BỘ dòng (mọi trạng thái isActive) cho panel quản trị. Trang chủ
// dùng riêng getHomeBanners() (src/lib/home-banners.ts, chỉ lấy isActive=true
// + resolve mặc định) — 2 đường đọc tách biệt, cùng lý do với
// GET /api/admin/category-tree vs getCategoryTree() công khai.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const banners = await prisma.homeBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ banners });
}

// POST — tạo 1 dòng mới. slot="LARGE" tạo thoải mái (thêm slide), sortOrder
// tự động = lớn nhất hiện có +1 nếu không truyền. slot="SMALL_1"/"SMALL_2"
// chỉ được giữ ĐÚNG 1 dòng — chặn tạo dòng thứ 2, admin phải PATCH dòng đã
// có thay vì tạo mới (tránh dữ liệu mập mờ dòng nào mới được đọc).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slot = typeof body?.slot === "string" ? body.slot : "";
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Vị trí banner không hợp lệ." }, { status: 400 });
  }

  if (slot !== "LARGE") {
    const existing = await prisma.homeBanner.findFirst({ where: { slot } });
    if (existing) {
      return NextResponse.json(
        { error: "Vị trí này đã có sẵn 1 banner — sửa banner hiện có thay vì tạo mới." },
        { status: 400 }
      );
    }
  }

  let sortOrder = Number.isInteger(body?.sortOrder) ? (body.sortOrder as number) : null;
  if (sortOrder === null) {
    const maxRow = await prisma.homeBanner.findFirst({
      where: { slot },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = (maxRow?.sortOrder ?? -1) + 1;
  }

  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : null;
  const description =
    typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;
  const ctaLabel = typeof body?.ctaLabel === "string" && body.ctaLabel.trim() ? body.ctaLabel.trim() : null;
  const ctaHref = typeof body?.ctaHref === "string" && body.ctaHref.trim() ? body.ctaHref.trim() : null;

  const banner = await prisma.homeBanner.create({
    data: { slot, sortOrder, imageUrl, title, description, ctaLabel, ctaHref },
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: `Thêm banner trang chủ (${slot})`,
    targetType: "HomeBanner",
    targetId: banner.id,
  });

  return NextResponse.json({ banner });
}
