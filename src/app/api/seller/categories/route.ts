import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { slugifyCategory } from "@/lib/slug";

// Seller tự đề xuất danh mục mới khi sản phẩm của họ chưa khớp danh mục nào
// có sẵn (nút "+ Thêm danh mục mới" ở cuối dropdown chọn danh mục trong
// AddProductForm). Tạo ngay với status "PENDING" (không chặn seller tiếp tục
// đăng sản phẩm — categoryId hợp lệ ngay lập tức) nhưng KHÔNG hiện công khai
// (trang chủ/trang danh mục/mega-menu đều lọc status "APPROVED", xem
// getAllCategories trong src/lib/queries.ts) cho tới khi admin duyệt tại
// POST /api/admin/categories/[id].
export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: "Tên danh mục phải từ 2-40 ký tự." },
      { status: 400 }
    );
  }

  const existingByName = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existingByName) {
    return NextResponse.json(
      { error: "Danh mục này đã tồn tại, vui lòng chọn trong danh sách." },
      { status: 400 }
    );
  }

  let slug = slugifyCategory(name);
  const existingBySlug = await prisma.category.findUnique({ where: { slug } });
  if (existingBySlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const category = await prisma.category.create({
    data: {
      slug,
      name,
      emoji: "🗂️",
      status: "PENDING",
      proposedById: seller!.id,
    },
  });

  return NextResponse.json({
    id: category.id,
    slug: category.slug,
    name: category.name,
    emoji: category.emoji,
    status: category.status,
  });
}
