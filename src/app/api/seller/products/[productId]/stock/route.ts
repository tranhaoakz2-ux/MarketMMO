import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MAX_LINE_LENGTH = 500;
const MAX_LINES_PER_REQUEST = 500;

// Seller nhập hàng loạt dữ liệu giao hàng thật (mỗi dòng textarea = 1 đơn vị
// có thể giao cho 1 buyer, vd 1 dòng "email|password|2fa" của 1 tài khoản
// Gmail) cho sản phẩm CỦA CHÍNH MÌNH — xem model ProductStockItem trong
// prisma/schema.prisma. `variantId` optional: có giá trị thì kho gắn vào
// đúng phiên bản đó (phải thuộc product này), không có thì gắn thẳng vào
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
  // Thời hạn sử dụng — ô textarea THỨ 2, khớp theo SỐ THỨ TỰ DÒNG với ô nội
  // dung (dòng N của expiresAt = hạn của dòng N ở items). Để trống dòng nào
  // nghĩa là đơn vị đó không có hạn (trộn được trong cùng batch). Rỗng toàn
  // bộ = không đơn vị nào có hạn (không đổi hành vi cũ).
  const rawExpiresAt: string = typeof body?.expiresAt === "string" ? body.expiresAt : "";
  const nominalTermDaysRaw = body?.nominalTermDays;
  const nominalTermDays =
    typeof nominalTermDaysRaw === "number" && Number.isFinite(nominalTermDaysRaw)
      ? Math.trunc(nominalTermDaysRaw)
      : null;

  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      return NextResponse.json({ error: "Phiên bản không hợp lệ." }, { status: 400 });
    }
  } else if (product.variants.length > 0) {
    return NextResponse.json(
      { error: "Sản phẩm này đã có phiên bản — vui lòng nhập kho riêng cho từng phiên bản." },
      { status: 400 }
    );
  }

  const rawItemLines = rawItems.split("\n").map((line) => line.trim());
  const lines = rawItemLines.filter(Boolean);

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

  // expiresAtByLine[i] tương ứng đúng lines[i] (đã align phía dưới) — null =
  // đơn vị đó không có hạn.
  let expiresAtByLine: (Date | null)[] = lines.map(() => null);
  const anyExpiryProvided = rawExpiresAt.trim().length > 0;
  if (anyExpiryProvided) {
    // Không cho phép dòng trống giữa chừng ở ô nội dung khi dùng kèm ngày
    // hết hạn — nếu không, việc lọc dòng trống (lines = rawItemLines.filter)
    // sẽ làm lệch chỉ số so với ô ngày hết hạn (dòng N không còn khớp dòng N).
    if (rawItemLines.length !== lines.length) {
      return NextResponse.json(
        {
          error:
            "Ô nội dung có dòng trống — vui lòng xoá dòng trống khi dùng kèm ngày hết hạn để 2 ô khớp đúng theo dòng.",
        },
        { status: 400 }
      );
    }
    const expiresAtLinesRaw = rawExpiresAt.split("\n").map((line) => line.trim());
    if (expiresAtLinesRaw.length !== lines.length) {
      return NextResponse.json(
        { error: "Số dòng ở ô Ngày hết hạn phải khớp với số dòng ở ô Nội dung." },
        { status: 400 }
      );
    }
    const hasAnyNonEmptyExpiry = expiresAtLinesRaw.some((l) => l.length > 0);
    if (hasAnyNonEmptyExpiry && (!nominalTermDays || nominalTermDays < 1)) {
      return NextResponse.json(
        { error: "Vui lòng chọn số ngày của gói đầy đủ (áp dụng cho các dòng có ngày hết hạn)." },
        { status: 400 }
      );
    }
    const parsed: (Date | null)[] = [];
    for (const raw of expiresAtLinesRaw) {
      if (!raw) {
        parsed.push(null);
        continue;
      }
      const date = new Date(raw);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: `Ngày hết hạn không hợp lệ hoặc đã ở quá khứ: "${raw}".` },
          { status: 400 }
        );
      }
      parsed.push(date);
    }
    expiresAtByLine = parsed;
  }

  await prisma.$transaction(async (tx) => {
    await tx.productStockItem.createMany({
      data: lines.map((content, i) => {
        const expiresAt = expiresAtByLine[i];
        return {
          productId,
          variantId,
          content,
          status: "AVAILABLE",
          expiresAt,
          nominalTermDays: expiresAt ? nominalTermDays : null,
        };
      }),
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
