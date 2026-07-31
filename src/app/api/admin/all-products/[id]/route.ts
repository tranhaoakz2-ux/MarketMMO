import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

// PATCH — sửa 1 sản phẩm ĐANG SỐNG trên sàn (không phải luồng duyệt
// PENDING/REJECTED — xem POST /api/admin/products/[id]). Nhận field nào thì
// sửa field đó, các field khác giữ nguyên. isActive nằm trong cùng route
// này (không tách route riêng) vì về bản chất vẫn là "sửa 1 thuộc tính của
// Product", đơn giản hơn cho client.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const data: {
    name?: string;
    shortDescription?: string;
    description?: string;
    price?: number;
    priceMax?: number | null;
    stock?: number;
    categoryId?: string;
    hot?: boolean;
    preOrder?: boolean;
    isActive?: boolean;
    isFeatured?: boolean;
    featuredOrder?: number | null;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 5 || name.length > 150) {
      return NextResponse.json({ error: "Tên sản phẩm phải từ 5-150 ký tự." }, { status: 400 });
    }
    data.name = name;
  }

  if (typeof body.shortDescription === "string") {
    const shortDescription = body.shortDescription.trim();
    if (shortDescription.length < 10 || shortDescription.length > 200) {
      return NextResponse.json({ error: "Mô tả ngắn phải từ 10-200 ký tự." }, { status: 400 });
    }
    data.shortDescription = shortDescription;
  }

  if (typeof body.description === "string") {
    const lines = body.description
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return NextResponse.json({ error: "Mô tả chi tiết không được để trống." }, { status: 400 });
    }
    data.description = JSON.stringify(lines);
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 1000) {
      return NextResponse.json({ error: "Giá phải là số, tối thiểu 1.000đ." }, { status: 400 });
    }
    data.price = price;
  }

  if (body.priceMax !== undefined) {
    if (body.priceMax === null || body.priceMax === "") {
      data.priceMax = null;
    } else {
      const priceMax = Number(body.priceMax);
      if (!Number.isFinite(priceMax) || priceMax < 1000) {
        return NextResponse.json({ error: "Giá cao nhất không hợp lệ." }, { status: 400 });
      }
      data.priceMax = priceMax;
    }
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Kho phải là số nguyên >= 0." }, { status: 400 });
    }
    data.stock = stock;
  }

  if (typeof body.categoryId === "string" && body.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      include: { _count: { select: { children: true } } },
    });
    if (!category || category.status === "REJECTED" || category._count.children > 0) {
      return NextResponse.json(
        { error: "Danh mục không hợp lệ — phải chọn danh mục lá, không phải nhóm cha." },
        { status: 400 }
      );
    }
    data.categoryId = body.categoryId;
  }

  if (typeof body.hot === "boolean") data.hot = body.hot;
  if (typeof body.preOrder === "boolean") data.preOrder = body.preOrder;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  // Ghim/bỏ ghim "Sản phẩm nổi bật" trang chủ — ghim mới tự gán featuredOrder
  // = lớn nhất hiện có + 1 (thêm vào CUỐI danh sách đang ghim, admin sắp lại
  // thứ tự sau ở /admin/noi-bat nếu muốn); bỏ ghim xoá luôn featuredOrder để
  // không để lại giá trị mồ côi vô nghĩa.
  if (typeof body.isFeatured === "boolean") {
    data.isFeatured = body.isFeatured;
    if (body.isFeatured) {
      if (!product.isFeatured) {
        const maxOrder = await prisma.product.aggregate({
          where: { isFeatured: true },
          _max: { featuredOrder: true },
        });
        data.featuredOrder = (maxOrder._max.featuredOrder ?? -1) + 1;
      }
    } else {
      data.featuredOrder = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  await prisma.product.update({ where: { id }, data });

  const action =
    "isFeatured" in data
      ? data.isFeatured
        ? "Ghim sản phẩm nổi bật"
        : "Bỏ ghim sản phẩm nổi bật"
      : "isActive" in data
        ? data.isActive
          ? "Hiện lại sản phẩm"
          : "Ẩn sản phẩm"
        : "Sửa sản phẩm";
  await logAdminAction({
    adminId: session!.user!.id,
    action,
    targetType: "Product",
    targetId: id,
    detail: product.name,
  });

  return NextResponse.json({ ok: true });
}

// DELETE — CHẶN nếu sản phẩm đã có đơn hàng hoặc đã có lượt đặt giá đấu giá
// (gợi ý dùng "Ẩn" thay vì xoá). Nếu qua được, tự dọn ProductStockItem còn
// AVAILABLE trước (an toàn vì orderItems=0 nghĩa là chưa từng có bản ghi
// SOLD) — ProductStockItem.product là onDelete:Restrict nên còn sót lại sẽ
// chặn xoá Product ở tầng DB. ProductVariant/ServiceFieldDefinition tự dọn
// qua onDelete:Cascade sẵn có, không cần xử lý thêm.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true, auctionBids: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }

  if (product._count.orderItems > 0) {
    return NextResponse.json(
      {
        error: `Không thể xoá — sản phẩm đã có ${product._count.orderItems} đơn hàng. Hãy dùng "Ẩn" thay vì xoá.`,
      },
      { status: 400 }
    );
  }
  if (product._count.auctionBids > 0) {
    return NextResponse.json(
      {
        error: `Không thể xoá — sản phẩm đã có ${product._count.auctionBids} lượt đặt giá đấu giá vị trí vàng. Hãy dùng "Ẩn" thay vì xoá.`,
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.productStockItem.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Xoá sản phẩm",
    targetType: "Product",
    targetId: id,
    detail: product.name,
  });

  return NextResponse.json({ ok: true });
}
