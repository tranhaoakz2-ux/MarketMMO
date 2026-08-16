import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Buyer tự sửa THÔNG TIN HIỂN THỊ của mình — CHỈ tên + số điện thoại. Email/
// username KHÔNG cho sửa ở đây vì là định danh đăng nhập (authorize() trong
// src/auth.ts tra cả 2 trường), đổi sai luồng có thể tự khoá đăng nhập của
// chính mình — quyết định phạm vi đã chốt với người dùng.
export async function PATCH(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (name.length < 2 || name.length > 50) {
    return NextResponse.json({ error: "Tên hiển thị phải từ 2-50 ký tự." }, { status: 400 });
  }
  if (phoneRaw && !/^[0-9+\s]{8,15}$/.test(phoneRaw)) {
    return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: { name, phone: phoneRaw || null },
    select: { name: true, phone: true },
  });

  return NextResponse.json(user);
}
