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
      // PRODUCT_LISTING_AUDIT.md #10 — trước đây route này KHÔNG trả mô tả
      // chi tiết/nội dung TUT_TRICK/TOOL, admin duyệt mà chưa từng đọc phần
      // nội dung dài nhất của sản phẩm. Route đã requireAdmin() ở trên, an
      // toàn để trả thẳng cho đúng admin — KHÁC buyer, không qua
      // reveal-delivered vì admin chưa "mua" gì, chỉ xem để duyệt.
      description: JSON.parse(p.description) as string[],
      tutTrickContent: p.tutTrickContent,
      toolUsageGuide: p.toolUsageGuide,
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl,
      status: p.status,
      adminNote: p.adminNote,
      createdAt: p.createdAt,
      categoryName: p.category.name,
      seller: p.seller,
      productType: p.productType,
      // TOOL: cho admin xem trước link tải khi duyệt. Chỉ hiển thị dạng
      // text ở UI — KHÔNG tự mở/tải, xem AdminProductsPanel.tsx.
      toolDeliveryLink: p.toolDeliveryLink,
    })),
  });
}
