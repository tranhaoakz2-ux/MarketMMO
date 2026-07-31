import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách ĐẦY ĐỦ seller đang được ghim (isFeatured=true), không giới hạn
// số lượng — dùng cho màn kéo-thả sắp thứ tự tại /admin/noi-bat.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const sellers = await prisma.seller.findMany({
    where: { isFeatured: true },
    orderBy: [{ featuredOrder: { sort: "asc", nulls: "last" } }],
    select: {
      id: true,
      slug: true,
      shopName: true,
      avatarUrl: true,
      level: true,
      suspended: true,
      featuredOrder: true,
    },
  });

  return NextResponse.json({
    sellers: sellers.map((s) => ({
      id: s.id,
      slug: s.slug,
      shopName: s.shopName,
      avatarUrl: s.avatarUrl,
      level: s.level,
      visible: !s.suspended,
      featuredOrder: s.featuredOrder,
    })),
  });
}
