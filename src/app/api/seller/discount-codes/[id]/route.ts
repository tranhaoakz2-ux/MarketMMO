import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

async function loadOwnedCode(sellerId: string, id: string) {
  const code = await prisma.discountCode.findUnique({ where: { id } });
  if (!code || code.sellerId !== sellerId) return null;
  return code;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { id } = await params;
  const existing = await loadOwnedCode(seller!.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Mã giảm giá không tồn tại." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const updated = await prisma.discountCode.update({
    where: { id },
    data: { active: body.active },
  });
  return NextResponse.json({ code: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { id } = await params;
  const existing = await loadOwnedCode(seller!.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Mã giảm giá không tồn tại." }, { status: 404 });
  }

  await prisma.discountCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
