import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách người dùng cho Admin > Người dùng — tìm kiếm theo email/username/
// tên, cắt 50 kết quả gần nhất (đủ dùng cho v1, chưa cần phân trang cursor).
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      walletBalance: true,
      banned: true,
      bannedReason: true,
      bannedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
