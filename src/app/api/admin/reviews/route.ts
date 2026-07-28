import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách review (mọi trạng thái hidden) cho panel kiểm duyệt admin — tìm
// kiếm theo tên gian hàng/tên người đánh giá/nội dung, cắt 50 kết quả gần
// nhất, cùng quy ước đơn giản đã dùng cho GET /api/admin/users|all-products.
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const reviews = await prisma.review.findMany({
    where: q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" } },
            { seller: { shopName: { contains: q, mode: "insensitive" } } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { username: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      seller: { select: { shopName: true, slug: true } },
      user: { select: { name: true, username: true, email: true } },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      hidden: r.hidden,
      createdAt: r.createdAt,
      sellerName: r.seller.shopName,
      sellerSlug: r.seller.slug,
      authorName: r.user.name ?? r.user.username ?? r.user.email ?? "Người dùng",
    })),
  });
}
