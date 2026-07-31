import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Danh sách ĐẦY ĐỦ sản phẩm đang được ghim (isFeatured=true), không giới
// hạn số lượng (admin ghim vô hạn) — KHÁC GET /api/admin/all-products (cắt
// 50 kết quả gần nhất, có thể bỏ sót sản phẩm ghim cũ nếu sàn có nhiều sản
// phẩm). Dùng cho màn kéo-thả sắp thứ tự tại /admin/noi-bat.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const products = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: [{ featuredOrder: { sort: "asc", nulls: "last" } }],
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      price: true,
      isActive: true,
      status: true,
      featuredOrder: true,
      seller: { select: { shopName: true, suspended: true } },
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: p.imageUrl,
      price: p.price,
      sellerName: p.seller.shopName,
      // Cho admin biết ngay mục nào đang KHÔNG hiện công khai dù đã ghim
      // (ẩn/chưa duyệt/gian hàng bị khoá) — không tự động bỏ ghim, chỉ cảnh
      // báo, vì admin có thể đang chuẩn bị trước khi kích hoạt lại.
      visible: p.isActive && p.status === "APPROVED" && !p.seller.suspended,
      featuredOrder: p.featuredOrder,
    })),
  });
}
