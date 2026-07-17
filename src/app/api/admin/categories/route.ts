import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    where: { status: { in: ["PENDING", "REJECTED"] } },
    orderBy: { id: "desc" },
    include: {
      proposedBy: { select: { shopName: true, slug: true } },
    },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      status: c.status,
      adminNote: c.adminNote,
      proposedBy: c.proposedBy,
    })),
  });
}
