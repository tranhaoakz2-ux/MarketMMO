import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import {
  MAX_PREORDER_DELIVERY_HOURS,
  MIN_ITEM_PRICE_AFTER_DISCOUNT,
  MIN_PREORDER_DELIVERY_HOURS,
  PRODUCT_WARRANTY_POLICY_MAX_LENGTH,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toWarrantyHours } from "@/lib/warranty";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { id: true } } },
  });
  if (!product || product.sellerId !== seller!.id) {
    return NextResponse.json({ error: "Sản phẩm không tồn tại." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  // Mega Sale — seller TOÀN QUYỀN tự bật/tắt cho cả sản phẩm (không tách
  // riêng từng variant, xem src/lib/mega-sale.ts). Tắt sale (active=false)
  // CHỈ đổi cờ megaSaleActive, GIỮ NGUYÊN type/percent/fixedPrice/endsAt cũ
  // trong DB để seller bật lại nhanh không phải nhập lại từ đầu.
  if (body && typeof body === "object" && "megaSale" in body) {
    const ms = body.megaSale;
    if (!ms || typeof ms !== "object" || typeof ms.active !== "boolean") {
      return NextResponse.json({ error: "Dữ liệu Mega Sale không hợp lệ." }, { status: 400 });
    }

    if (!ms.active) {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: { megaSaleActive: false },
      });
      return NextResponse.json({ megaSaleActive: updated.megaSaleActive });
    }

    const type = ms.type === "PERCENT" ? "PERCENT" : ms.type === "FIXED" ? "FIXED" : null;
    if (!type) {
      return NextResponse.json(
        { error: "Vui lòng chọn kiểu giảm giá: theo % hoặc giá trực tiếp." },
        { status: 400 }
      );
    }

    let endsAt: Date | null = null;
    if (ms.endsAt != null && ms.endsAt !== "") {
      const parsed = new Date(ms.endsAt);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "Ngày giờ kết thúc hẹn giờ phải ở tương lai." },
          { status: 400 }
        );
      }
      endsAt = parsed;
    }

    if (type === "PERCENT") {
      const percent = Number(ms.percent);
      if (!Number.isInteger(percent) || percent < 1 || percent > 99) {
        return NextResponse.json(
          { error: "Phần trăm giảm phải là số nguyên từ 1 đến 99." },
          { status: 400 }
        );
      }
      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          megaSaleActive: true,
          megaSaleType: "PERCENT",
          megaSalePercent: percent,
          megaSaleFixedPrice: null,
          megaSaleEndsAt: endsAt,
        },
      });
      return NextResponse.json({ megaSaleActive: updated.megaSaleActive });
    }

    // type === "FIXED" — chỉ hợp lệ cho sản phẩm giá đơn thật sự (không
    // priceMax, không variant) vì 1 giá cố định không thể áp cho nhiều mức
    // giá khác nhau cùng lúc.
    if (product.priceMax != null || product.variants.length > 0) {
      return NextResponse.json(
        {
          error:
            "Giá sale trực tiếp chỉ áp dụng được cho sản phẩm 1 mức giá (không có khoảng giá, không có phiên bản). Vui lòng dùng kiểu giảm theo % cho sản phẩm này.",
        },
        { status: 400 }
      );
    }
    const fixedPrice = Number(ms.fixedPrice);
    if (!Number.isInteger(fixedPrice) || fixedPrice < MIN_ITEM_PRICE_AFTER_DISCOUNT) {
      return NextResponse.json(
        { error: `Giá sale phải là số nguyên từ ${MIN_ITEM_PRICE_AFTER_DISCOUNT.toLocaleString("vi-VN")}đ trở lên.` },
        { status: 400 }
      );
    }
    if (fixedPrice >= product.price) {
      return NextResponse.json(
        { error: "Giá sale phải thấp hơn giá gốc hiện tại." },
        { status: 400 }
      );
    }
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        megaSaleActive: true,
        megaSaleType: "FIXED",
        megaSalePercent: null,
        megaSaleFixedPrice: fixedPrice,
        megaSaleEndsAt: endsAt,
      },
    });
    return NextResponse.json({ megaSaleActive: updated.megaSaleActive });
  }

  // Chính sách bảo hành (Product.warrantyPolicy) — CHỈ sửa được khi sản phẩm
  // CHƯA có đơn nào. Chốt chặn THẬT nằm ở đây: đếm lại OrderItem trực tiếp
  // từ DB, KHÔNG tin cờ `warrantyPolicyLocked` client gửi lên (client chỉ
  // dùng cờ đó để hiện UI khoá) — chống seller hạ chính sách bảo hành sau
  // khi buyer đã mua dựa trên chính sách ban đầu.
  if (body && typeof body === "object" && "warrantyPolicy" in body) {
    const hasOrder = await prisma.orderItem.findFirst({
      where: { productId },
      select: { id: true },
    });
    if (hasOrder) {
      return NextResponse.json(
        {
          error:
            "Sản phẩm đã có đơn hàng, không thể sửa chính sách bảo hành để bảo vệ người mua.",
        },
        { status: 400 }
      );
    }
    const raw = typeof body.warrantyPolicy === "string" ? body.warrantyPolicy.trim() : "";
    if (raw.length > PRODUCT_WARRANTY_POLICY_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Chính sách bảo hành tối đa ${PRODUCT_WARRANTY_POLICY_MAX_LENGTH.toLocaleString("vi-VN")} ký tự.` },
        { status: 400 }
      );
    }
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { warrantyPolicy: raw.length > 0 ? raw : null },
    });
    return NextResponse.json({ warrantyPolicy: updated.warrantyPolicy });
  }

  if (typeof body?.preOrder !== "boolean") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  // Bật "Đặt trước" BẮT BUỘC kèm thời gian giao hàng + thời gian bảo hành —
  // validate min/max ở đây (server, không tin riêng UI). Bảo hành bắt buộc
  // > 0 khi bật preOrder (dù productType không phải PRODUCT vẫn không cho
  // "bán đứt" — đơn đặt trước cần cửa sổ bảo hành thật để cơ chế "giữ ký quỹ
  // đến hết bảo hành" có ý nghĩa bảo vệ buyer sau khi seller giao). Tắt thì
  // không cần kèm gì (giữ nguyên preOrderDeliveryValue/Unit/warrantyValue cũ
  // trong DB để seller bật lại không phải nhập lại từ đầu).
  if (body.preOrder) {
    const deliveryValue = Number(body.preOrderDeliveryValue);
    const deliveryUnit = body.preOrderDeliveryUnit === "hour" ? "hour" : "day";
    if (!Number.isInteger(deliveryValue) || deliveryValue <= 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập thời gian giao hàng cam kết hợp lệ." },
        { status: 400 }
      );
    }
    const deliveryHours = toWarrantyHours(deliveryValue, deliveryUnit);
    if (deliveryHours < MIN_PREORDER_DELIVERY_HOURS || deliveryHours > MAX_PREORDER_DELIVERY_HOURS) {
      return NextResponse.json(
        {
          error: `Thời gian giao hàng phải từ ${MIN_PREORDER_DELIVERY_HOURS} giờ đến ${Math.round(MAX_PREORDER_DELIVERY_HOURS / 24)} ngày.`,
        },
        { status: 400 }
      );
    }

    const warrantyValue = Number(body.warrantyValue);
    const warrantyUnit = body.warrantyUnit === "hour" ? "hour" : "day";
    if (!Number.isInteger(warrantyValue) || warrantyValue <= 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập thời gian bảo hành hợp lệ (đặt trước không cho phép bán đứt)." },
        { status: 400 }
      );
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        preOrder: true,
        preOrderDeliveryValue: deliveryValue,
        preOrderDeliveryUnit: deliveryUnit,
        warrantyValue,
        warrantyUnit,
      },
    });
    return NextResponse.json({
      preOrder: updated.preOrder,
      preOrderDeliveryValue: updated.preOrderDeliveryValue,
      preOrderDeliveryUnit: updated.preOrderDeliveryUnit,
      warrantyValue: updated.warrantyValue,
      warrantyUnit: updated.warrantyUnit,
    });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { preOrder: false },
  });

  return NextResponse.json({ preOrder: updated.preOrder });
}
