import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách sản phẩm ĐÃ DUYỆT của 1 seller — dùng cho dropdown "chọn sản
// phẩm" trong form gán thủ công vị trí vàng (Admin > Đấu giá). Chỉ sản phẩm
// APPROVED mới hợp lý để đưa lên carousel "Sản phẩm nổi bật" công khai.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const products = await prisma.product.findMany({
    where: { sellerId: id, status: "APPROVED" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ products });
}
