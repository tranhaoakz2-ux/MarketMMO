import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const sellers = await prisma.seller.findMany({
    where: q
      ? {
          OR: [
            { shopName: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { email: true, walletBalance: true } },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({
    sellers: sellers.map((s) => ({
      id: s.id,
      shopName: s.shopName,
      slug: s.slug,
      level: s.level,
      verified: s.verified,
      suspended: s.suspended,
      suspendedReason: s.suspendedReason,
      insuranceBalance: s.insuranceBalance,
      productCount: s._count.products,
      createdAt: s.createdAt,
      user: { email: s.user.email, walletBalance: s.user.walletBalance },
    })),
  });
}
