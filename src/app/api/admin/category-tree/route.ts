import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { slugifyCategory } from "@/lib/slug";
import { logAdminAction } from "@/lib/audit";

// GET — TOÀN BỘ category (mọi status, cả nhóm cha lẫn lá) kèm số con/số sản
// phẩm — dùng riêng cho panel quản trị cây danh mục (Giai đoạn 2). KHÁC
// GET /api/admin/categories (chỉ trả PENDING/REJECTED cho luồng duyệt đề
// xuất của seller — 2 route độc lập, không gộp).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      status: c.status,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
      childCount: c._count.children,
    })),
  });
}

// POST — admin tạo mới 1 nhóm cha (parentId=null) hoặc 1 danh mục con
// (parentId hợp lệ). Tạo thẳng với status="APPROVED" (admin có toàn quyền,
// không qua luồng duyệt như category seller tự đề xuất) + isActive=true.
// slug sinh 1 lần bằng slugifyCategory() (cùng hàm dùng ở luồng seller đề
// xuất) và KHÔNG BAO GIỜ đổi lại sau (kể cả khi admin sửa tên qua PATCH) —
// giữ URL/SEO ổn định cho mọi category, không chỉ 10 category seed gốc.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
  const parentId = typeof body?.parentId === "string" && body.parentId ? body.parentId : null;
  const sortOrder = Number.isInteger(body?.sortOrder) ? (body.sortOrder as number) : 0;

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Tên phải từ 2-60 ký tự." }, { status: 400 });
  }
  if (emoji.length > 8) {
    return NextResponse.json({ error: "Emoji tối đa 8 ký tự." }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Nhóm cha không tồn tại." }, { status: 400 });
    }
  }

  const existingByName = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existingByName) {
    return NextResponse.json({ error: "Đã có danh mục trùng tên." }, { status: 400 });
  }

  let slug = slugifyCategory(name);
  const existingBySlug = await prisma.category.findUnique({ where: { slug } });
  if (existingBySlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const category = await prisma.category.create({
    data: { slug, name, emoji, status: "APPROVED", parentId, sortOrder, isActive: true },
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: parentId ? "Tạo danh mục con" : "Tạo nhóm danh mục cha",
    targetType: "Category",
    targetId: category.id,
    detail: name,
  });

  return NextResponse.json({ id: category.id, slug: category.slug });
}
