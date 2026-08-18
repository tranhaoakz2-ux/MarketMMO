import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const products = await prisma.product.findMany({
    where: { status: { in: ["PENDING", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      seller: { select: { shopName: true, slug: true } },
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl,
      status: p.status,
      adminNote: p.adminNote,
      createdAt: p.createdAt,
      categoryName: p.category.name,
      seller: p.seller,
      productType: p.productType,
      // TOOL: cho admin xem trước link/tên file khi duyệt (route này đã
      // requireAdmin() ở trên, an toàn để trả thẳng — KHÁC buyer, không cần
      // qua cơ chế reveal-delivered vì admin chưa "mua" gì). File thật tải
      // qua GET /api/admin/products/[id]/tool-file riêng, KHÔNG trả
      // toolFileUrl (đường dẫn lưu trữ) ra đây.
      toolDeliveryLink: p.toolDeliveryLink,
      toolFileName: p.toolFileName,
      toolFileSize: p.toolFileSize,
    })),
  });
}
