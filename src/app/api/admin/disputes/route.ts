import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      openedBy: { select: { email: true, username: true, name: true } },
      orderItem: {
        include: {
          order: { include: { buyer: { select: { email: true, username: true, name: true } } } },
          product: { include: { seller: { select: { shopName: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ disputes });
}
