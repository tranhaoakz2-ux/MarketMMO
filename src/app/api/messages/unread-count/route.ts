import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const count = await prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: session!.user.id },
      conversation: {
        OR: [{ userAId: session!.user.id }, { userBId: session!.user.id }],
      },
    },
  });

  return NextResponse.json({ count });
}
