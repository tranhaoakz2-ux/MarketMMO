import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const adminNote = typeof body?.adminNote === "string" ? body.adminNote.slice(0, 500) : null;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }
  if (product.status !== "PENDING") {
    return NextResponse.json({ error: "Sản phẩm này đã được xử lý." }, { status: 400 });
  }

  if (action === "approve") {
    // Chặn duyệt sản phẩm giao TỰ ĐỘNG TỪ KHO (deliveryMethod="AUTO_STOCK",
    // productType="PRODUCT" — KHÔNG áp cho TOOL vì TOOL hợp lệ khi giao thuần
    // qua toolDeliveryLink, không cần ProductStockItem nào) mà kho vẫn rỗng —
    // chống seller đăng "kho số đếm không nội dung" lấy tiền buyer mà không
    // giao được gì (xem checkout.ts: stockItemTotal===0 thì deliveredPayload
    // giữ nguyên null). Đây là chốt chặn SERVER BẮT BUỘC duy nhất — chạy SAU
    // khi seller đã có mọi cơ hội thêm kho (lúc đăng lẫn qua
    // ProductVariantManager sau đó), không quan tâm kho được thêm bằng cách
    // nào. KHÔNG đổi status khi chặn (giữ PENDING) — seller bổ sung kho rồi
    // admin duyệt lại, không phải REJECT.
    if (product.productType === "PRODUCT" && product.deliveryMethod === "AUTO_STOCK") {
      const variants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true, label: true },
      });
      if (variants.length === 0) {
        const count = await prisma.productStockItem.count({ where: { productId: id, variantId: null } });
        if (count === 0) {
          return NextResponse.json(
            { error: "Chưa có dữ liệu kho — thêm ít nhất 1 sản phẩm vào kho trước khi duyệt." },
            { status: 400 }
          );
        }
      } else {
        // Chặn nếu BẤT KỲ phiên bản nào rỗng kho (không chỉ khi tất cả rỗng)
        // — buyer chọn đúng phiên bản rỗng đó vẫn dính đúng lỗ hổng này.
        const counts = await prisma.productStockItem.groupBy({
          by: ["variantId"],
          where: { productId: id, variantId: { not: null } },
          _count: { _all: true },
        });
        const withStock = new Set(counts.map((c) => c.variantId));
        const emptyVariant = variants.find((v) => !withStock.has(v.id));
        if (emptyVariant) {
          return NextResponse.json(
            {
              error: `Phiên bản "${emptyVariant.label}" chưa có dữ liệu kho — thêm ít nhất 1 sản phẩm vào kho trước khi duyệt.`,
            },
            { status: 400 }
          );
        }
      }
    }

    await prisma.product.update({
      where: { id },
      data: { status: "APPROVED", adminNote },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Duyệt sản phẩm",
      targetType: "Product",
      targetId: id,
      detail: product.name,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    await prisma.product.update({
      where: { id },
      data: { status: "REJECTED", adminNote },
    });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Từ chối sản phẩm",
      targetType: "Product",
      targetId: id,
      detail: adminNote ?? product.name,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
