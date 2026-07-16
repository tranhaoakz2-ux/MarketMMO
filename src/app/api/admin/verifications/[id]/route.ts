import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.slice(0, 500) : null;

  const verification = await prisma.sellerVerification.findUnique({ where: { id } });
  if (!verification) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu xác thực." }, { status: 404 });
  }
  if (verification.status !== "PENDING") {
    return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.sellerVerification.update({
        where: { id },
        data: { status: "APPROVED", adminNote, reviewedAt: new Date() },
      }),
      prisma.seller.update({
        where: { id: verification.sellerId },
        data: { verified: true },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.sellerVerification.update({
      where: { id },
      data: { status: "REJECTED", adminNote, reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
