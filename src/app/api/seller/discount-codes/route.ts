import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const CODE_RE = /^[A-Z0-9]{4,20}$/;

export async function GET() {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const codes = await prisma.discountCode.findMany({
    where: { sellerId: seller!.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ codes });
}

export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const type = body?.type === "FIXED" ? "FIXED" : body?.type === "PERCENT" ? "PERCENT" : null;
  const value = Number(body?.value);
  const maxUses =
    body?.maxUses === null || body?.maxUses === undefined || body?.maxUses === ""
      ? null
      : Number(body.maxUses);
  const expiresAt =
    typeof body?.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt) : null;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "Mã giảm giá chỉ gồm chữ in hoa/số, 4-20 ký tự." },
      { status: 400 }
    );
  }
  if (!type) {
    return NextResponse.json({ error: "Loại giảm giá không hợp lệ." }, { status: 400 });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Giá trị giảm giá không hợp lệ." }, { status: 400 });
  }
  if (type === "PERCENT" && value > 100) {
    return NextResponse.json({ error: "Giảm theo % tối đa 100." }, { status: 400 });
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return NextResponse.json(
      { error: "Số lần dùng tối đa phải là số nguyên dương." },
      { status: 400 }
    );
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Ngày hết hạn không hợp lệ." }, { status: 400 });
  }

  const existing = await prisma.discountCode.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Mã giảm giá này đã tồn tại." }, { status: 400 });
  }

  const created = await prisma.discountCode.create({
    data: {
      sellerId: seller!.id,
      code,
      type,
      value: Math.round(value),
      maxUses,
      expiresAt,
    },
  });

  return NextResponse.json({ code: created });
}
