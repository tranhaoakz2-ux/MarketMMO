import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { isValidCtaHref } from "@/lib/banner-link";

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

// POST — tạo 1 dòng mới cho BẤT KỲ slot nào (LARGE/SMALL_1/SMALL_2đều không
// giới hạn số slide — trước đây SMALL_1/SMALL_2 chỉ được giữ đúng 1 dòng,
// giới hạn đó nằm ở tầng API/UI, không phải schema, đã gỡ để cả 3 vị trí
// đồng nhất). sortOrder tự động = lớn nhất hiện có TRONG ĐÚNG SLOT ĐÓ +1 nếu
// không truyền.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const slot = typeof body?.slot === "string" ? body.slot : "";
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Vị trí banner không hợp lệ." }, { status: 400 });
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

  // Cả 3 slot đều render thành href công khai cho MỌI khách trang chủ khi có
  // ảnh/slide — chặn cứng định dạng sai/nguy hiểm (javascript:, data:...).
  if (ctaHref && !isValidCtaHref(ctaHref)) {
    return NextResponse.json(
      { error: "Link đích không hợp lệ — phải bắt đầu bằng \"/\" (nội bộ) hoặc \"http(s)://\" (bên ngoài)." },
      { status: 400 }
    );
  }

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
