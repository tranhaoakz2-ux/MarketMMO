import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const verifications = await prisma.sellerVerification.findMany({
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { shopName: true, slug: true } } },
  });

  return NextResponse.json({ verifications });
}
