import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { collectDescendantCategoryIds } from "@/lib/queries";

// PATCH — sửa tên/emoji/sortOrder/isActive/parentId của 1 category (nhóm
// cha hoặc lá). CỐ TÌNH không cho sửa slug ở đây — slug cố định từ lúc tạo
// (xem POST /api/admin/category-tree), giữ URL/SEO ổn định kể cả khi đổi tên.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const data: {
    name?: string;
    emoji?: string;
    sortOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: "Tên phải từ 2-60 ký tự." }, { status: 400 });
    }
    const dupe = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
    });
    if (dupe) {
      return NextResponse.json({ error: "Đã có danh mục trùng tên." }, { status: 400 });
    }
    data.name = name;
  }

  if (typeof body.emoji === "string") {
    const emoji = body.emoji.trim();
    if (!emoji || emoji.length > 8) {
      return NextResponse.json({ error: "Vui lòng nhập 1 emoji đại diện." }, { status: 400 });
    }
    data.emoji = emoji;
  }

  if (Number.isInteger(body.sortOrder)) {
    data.sortOrder = body.sortOrder as number;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if ("parentId" in body) {
    const newParentId: string | null = body.parentId || null;
    if (newParentId === id) {
      return NextResponse.json(
        { error: "Không thể chọn chính danh mục này làm nhóm cha của nó." },
        { status: 400 }
      );
    }
    if (newParentId) {
      const parent = await prisma.category.findUnique({ where: { id: newParentId } });
      if (!parent) {
        return NextResponse.json({ error: "Nhóm cha không tồn tại." }, { status: 400 });
      }
      // Chặn gán 1 category CON (cháu...) của chính nó làm cha — tạo vòng
      // lặp vô hạn trong cây (self-reference).
      const descendantIds = await collectDescendantCategoryIds(id);
      if (descendantIds.includes(newParentId)) {
        return NextResponse.json(
          { error: "Không thể chọn 1 danh mục con của chính nó làm nhóm cha (sẽ tạo vòng lặp)." },
          { status: 400 }
        );
      }
    }
    data.parentId = newParentId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  await prisma.category.update({ where: { id }, data });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa danh mục",
    targetType: "Category",
    targetId: id,
    detail: `${category.emoji} ${category.name} → ${JSON.stringify(data)}`,
  });

  return NextResponse.json({ ok: true });
}

// DELETE — CHẶN xoá nếu còn category con (childCount>0) hoặc còn sản phẩm
// gán trực tiếp (productCount>0), tránh mồ côi dữ liệu. Client phải tự xác
// nhận trước khi gọi (không có bước "xác nhận" phía server).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
  }

  if (category._count.children > 0) {
    return NextResponse.json(
      {
        error: `Không thể xoá — còn ${category._count.children} danh mục con bên trong. Hãy chuyển hoặc xoá chúng trước.`,
      },
      { status: 400 }
    );
  }
  if (category._count.products > 0) {
    return NextResponse.json(
      { error: `Không thể xoá — còn ${category._count.products} sản phẩm đang gán vào danh mục này.` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Xoá danh mục",
    targetType: "Category",
    targetId: id,
    detail: `${category.emoji} ${category.name}`,
  });

  return NextResponse.json({ ok: true });
}
