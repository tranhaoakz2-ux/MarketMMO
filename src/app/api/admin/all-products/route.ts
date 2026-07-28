import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách TOÀN BỘ sản phẩm (mọi status/isActive) cho panel quản trị
// catalogue — KHÁC GET /api/admin/products (chỉ trả PENDING/REJECTED cho
// luồng duyệt đăng mới). Tìm kiếm theo tên/slug/tên gian hàng, cắt 50 kết
// quả gần nhất — cùng quy ước đơn giản đã dùng cho GET /api/admin/users.
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { seller: { shopName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      category: { select: { name: true, slug: true } },
      seller: { select: { shopName: true, slug: true } },
      _count: { select: { orderItems: true, auctionBids: true } },
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      description: JSON.parse(p.description) as string[],
      price: p.price,
      priceMax: p.priceMax,
      stock: p.stock,
      sold: p.sold,
      status: p.status,
      isActive: p.isActive,
      productType: p.productType,
      hot: p.hot,
      preOrder: p.preOrder,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      sellerName: p.seller.shopName,
      sellerSlug: p.seller.slug,
      orderCount: p._count.orderItems,
      bidCount: p._count.auctionBids,
      createdAt: p.createdAt,
    })),
  });
}
