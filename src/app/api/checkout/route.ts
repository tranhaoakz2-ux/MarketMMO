import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ESCROW_HOLD_DAYS, REFERRAL_COMMISSION_PERCENT } from "@/lib/constants";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { prisma } from "@/lib/prisma";

type CheckoutItem = { productId: string; variantId?: string; quantity: number };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const items: CheckoutItem[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Giỏ hàng trống." }, { status: 400 });
  }
  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json({ error: "Dữ liệu giỏ hàng không hợp lệ." }, { status: 400 });
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
        include: { variants: true },
      });

      let total = 0;
      const itemsToCreate: {
        productId: string;
        variantId?: string;
        variantLabel?: string;
        sellerId: string;
        productName: string;
        quantity: number;
        price: number;
      }[] = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
        }

        let unitPrice = product.price;
        let variantLabel: string | undefined;
        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            throw new Error(`Biến thể không tồn tại cho sản phẩm "${product.name}".`);
          }
          // Sản phẩm "Đặt trước" (preOrder) bỏ qua kiểm tra tồn kho — seller
          // chưa có hàng thật, buyer vẫn trả tiền trước (giữ nguyên hệ thống
          // ký quỹ có sẵn), stock có thể xuống âm làm tín hiệu "nợ hàng".
          if (!product.preOrder && variant.stock < item.quantity) {
            throw new Error(`"${product.name} - ${variant.label}" không đủ tồn kho.`);
          }
          unitPrice = variant.price;
          variantLabel = variant.label;
        } else if (product.variants.length > 0) {
          throw new Error(`Vui lòng chọn loại sản phẩm cho "${product.name}".`);
        } else if (!product.preOrder && product.stock < item.quantity) {
          throw new Error(`"${product.name}" không đủ tồn kho.`);
        }

        total += unitPrice * item.quantity;
        itemsToCreate.push({
          productId: product.id,
          variantId: item.variantId,
          variantLabel,
          sellerId: product.sellerId,
          productName: product.name,
          quantity: item.quantity,
          price: unitPrice,
        });
      }

      // Mã giảm giá: chỉ áp dụng cho các dòng hàng thuộc ĐÚNG seller đã tạo
      // mã (không giảm chéo sang sản phẩm seller khác trong cùng đơn). Validate
      // + tăng usedCount NGAY TRONG transaction này để tránh race condition
      // (2 checkout dùng cùng mã maxUses=1 cùng lúc đều pass check "còn lượt").
      let appliedDiscountCode: string | null = null;
      let discountAmount = 0;
      const rawDiscountCode =
        typeof body?.discountCode === "string" ? body.discountCode.trim().toUpperCase().slice(0, 50) : "";
      if (rawDiscountCode) {
        const discount = await tx.discountCode.findUnique({ where: { code: rawDiscountCode } });
        if (!discount) {
          throw new Error("Mã giảm giá không tồn tại.");
        }
        if (!isDiscountCodeUsable(discount)) {
          throw new Error("Mã giảm giá đã hết hạn hoặc không còn khả dụng.");
        }
        const eligibleItems = itemsToCreate.filter((i) => i.sellerId === discount.sellerId);
        if (eligibleItems.length === 0) {
          throw new Error("Mã giảm giá không áp dụng cho sản phẩm nào trong đơn hàng này.");
        }
        const eligibleSubtotal = eligibleItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const rawDiscount = computeDiscountAmount(discount, eligibleSubtotal);
        const { items: discountedEligible, actualDiscount } = distributeDiscount(
          eligibleItems,
          rawDiscount
        );

        let eligibleIdx = 0;
        for (let i = 0; i < itemsToCreate.length; i++) {
          if (itemsToCreate[i].sellerId === discount.sellerId) {
            itemsToCreate[i] = discountedEligible[eligibleIdx];
            eligibleIdx++;
          }
        }

        appliedDiscountCode = discount.code;
        discountAmount = actualDiscount;
        total -= actualDiscount;

        await tx.discountCode.update({
          where: { id: discount.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
      });
      if (buyer.walletBalance < total) {
        throw new Error("Số dư ví không đủ để thanh toán đơn hàng này.");
      }

      const escrowReleaseAt = new Date();
      escrowReleaseAt.setDate(escrowReleaseAt.getDate() + ESCROW_HOLD_DAYS);

      const createdOrder = await tx.order.create({
        data: {
          buyerId: buyer.id,
          totalAmount: total,
          status: "ESCROW",
          discountCode: appliedDiscountCode,
          discountAmount,
          items: {
            create: itemsToCreate.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              variantLabel: i.variantLabel,
              sellerId: i.sellerId,
              productName: i.productName,
              quantity: i.quantity,
              price: i.price,
              status: "ESCROW",
              escrowReleaseAt,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of itemsToCreate) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          });
        }
      }

      await tx.user.update({
        where: { id: buyer.id },
        data: { walletBalance: { decrement: total } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: buyer.id,
          type: "PURCHASE",
          amount: -total,
          status: "CONFIRMED",
          note: `Thanh toán đơn hàng #${createdOrder.id}`,
          confirmedAt: new Date(),
        },
      });

      // Hoa hồng affiliate: tính theo % giá trị đơn hàng này (áp dụng cho MỌI
      // đơn, không chỉ đơn đầu tiên), cộng thẳng vào ví người giới thiệu —
      // miễn buyer được giới thiệu bởi ai đó và đã từng nạp tiền thật (không
      // chỉ nhờ số dư có sẵn từ nơi khác).
      if (buyer.referredById) {
        const hasDeposit = await tx.walletTransaction.findFirst({
          where: { userId: buyer.id, type: "DEPOSIT", status: "CONFIRMED" },
        });
        if (hasDeposit) {
          const commission = Math.round(total * REFERRAL_COMMISSION_PERCENT);
          if (commission > 0) {
            await tx.user.update({
              where: { id: buyer.referredById },
              data: { walletBalance: { increment: commission } },
            });
            await tx.walletTransaction.create({
              data: {
                userId: buyer.referredById,
                type: "REFERRAL_BONUS",
                amount: commission,
                status: "CONFIRMED",
                note: `Hoa hồng ${(REFERRAL_COMMISSION_PERCENT * 100).toFixed(0)}% — ${buyer.username ?? buyer.email} mua đơn #${createdOrder.id}`,
                confirmedAt: new Date(),
              },
            });
          }
        }
      }

      return createdOrder;
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tạo đơn hàng thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
