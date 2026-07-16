import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: session!.user.id, type: "DEPOSIT" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ transactions });
}
