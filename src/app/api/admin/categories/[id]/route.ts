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

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
  }
  if (category.status !== "PENDING") {
    return NextResponse.json({ error: "Danh mục này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.category.update({
      where: { id },
      data: { status: "APPROVED", adminNote },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.category.update({
      where: { id },
      data: { status: "REJECTED", adminNote },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
