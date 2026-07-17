import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MAX_LINE_LENGTH = 500;
const MAX_LINES_PER_REQUEST = 500;

// Seller nhập hàng loạt dữ liệu giao hàng thật (mỗi dòng textarea = 1 đơn vị
// có thể giao cho 1 buyer, vd 1 dòng "email|password|2fa" của 1 tài khoản
// Gmail) cho sản phẩm CỦA CHÍNH MÌNH — xem model ProductStockItem trong
// prisma/schema.prisma. `variantId` optional: có giá trị thì kho gắn vào
// đúng biến thể đó (phải thuộc product này), không có thì gắn thẳng vào
// Product gốc (chỉ hợp lệ khi sản phẩm CHƯA có variant nào — nếu đã có
// variant, mỗi variant phải tự nhập kho riêng, không dùng chung kho gốc).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product || product.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const variantId = typeof body?.variantId === "string" && body.variantId ? body.variantId : null;
  const rawItems: string = typeof body?.items === "string" ? body.items : "";

  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      return NextResponse.json({ error: "Biến thể không hợp lệ." }, { status: 400 });
    }
  } else if (product.variants.length > 0) {
    return NextResponse.json(
      { error: "Sản phẩm này đã có biến thể — vui lòng nhập kho riêng cho từng biến thể." },
      { status: 400 }
    );
  }

  const lines = rawItems
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return NextResponse.json({ error: "Vui lòng nhập ít nhất 1 dòng dữ liệu." }, { status: 400 });
  }
  if (lines.length > MAX_LINES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Chỉ được nhập tối đa ${MAX_LINES_PER_REQUEST} dòng mỗi lần.` },
      { status: 400 }
    );
  }
  const tooLong = lines.find((line) => line.length > MAX_LINE_LENGTH);
  if (tooLong) {
    return NextResponse.json(
      { error: `Mỗi dòng tối đa ${MAX_LINE_LENGTH} ký tự.` },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.productStockItem.createMany({
      data: lines.map((content) => ({
        productId,
        variantId,
        content,
        status: "AVAILABLE",
      })),
    });

    if (variantId) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: lines.length } },
      });
    } else {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: lines.length } },
      });
    }
  });

  const availableCount = await prisma.productStockItem.count({
    where: { productId, variantId, status: "AVAILABLE" },
  });

  return NextResponse.json({ added: lines.length, availableCount });
}
