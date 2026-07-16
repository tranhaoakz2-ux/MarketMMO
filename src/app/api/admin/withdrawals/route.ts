import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const withdrawals = await prisma.walletTransaction.findMany({
    where: { type: "WITHDRAW" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      status: true,
      note: true,
      createdAt: true,
      user: { select: { email: true, username: true, name: true } },
    },
  });

  return NextResponse.json({ withdrawals });
}
