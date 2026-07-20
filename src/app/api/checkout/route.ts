import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { ESCROW_HOLD_DAYS, REFERRAL_COMMISSION_PERCENT } from "@/lib/constants";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { prisma } from "@/lib/prisma";

type CheckoutItem = { productId: string; variantId?: string; quantity: number };

export async function POST(req: Request) {
  // Dùng requireUser() (không phải await auth() trực tiếp) để cùng chặn tài
  // khoản bị khoá (banned) như mọi route khác — user bị ban không được checkout.
  const { session, error } = await requireUser();
  if (error) return error;

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
        // Kho dữ liệu giao hàng thật đã claim được cho dòng hàng này (rỗng =
        // sản phẩm/phiên bản chưa dùng kho thật, xem model ProductStockItem).
        claimedStockItemIds: string[];
        deliveredPayload: string | null;
        // true = dòng hàng dùng "kho số học" (Product.stock/Variant.stock) và
        // KHÔNG phải preOrder → phải trừ kho CÓ ĐIỀU KIỆN (nguyên tử) để chặn
        // oversell khi 2 buyer mua song song (bug B3). false = đã claim kho
        // thật (đã nguyên tử qua FOR UPDATE SKIP LOCKED) hoặc preOrder (cho âm).
        guardLegacyStock: boolean;
      }[] = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
        }

        let unitPrice = product.price;
        let variantLabel: string | undefined;
        let variant: (typeof product.variants)[number] | undefined;

        if (item.variantId) {
          variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            throw new Error(`Phiên bản không tồn tại cho sản phẩm "${product.name}".`);
          }
          unitPrice = variant.price;
          variantLabel = variant.label;
        } else if (product.variants.length > 0) {
          throw new Error(`Vui lòng chọn loại sản phẩm cho "${product.name}".`);
        }

        const displayLabel = variantLabel ? `${product.name} - ${variantLabel}` : product.name;

        // Sản phẩm/phiên bản có kho dữ liệu giao hàng thật hay không — kiểm
        // tra bằng COUNT (không cần cờ boolean riêng, xem model
        // ProductStockItem). count = 0 nghĩa là seller CHƯA từng nhập kho
        // thật cho SKU này, giữ nguyên hành vi cũ 100% (kiểm tra theo
        // Product.stock/ProductVariant.stock, không có nội dung giao hàng).
        const stockItemTotal = await tx.productStockItem.count({
          where: { productId: product.id, variantId: item.variantId ?? null },
        });

        let claimedStockItemIds: string[] = [];
        let deliveredPayload: string | null = null;

        if (stockItemTotal > 0) {
          // Chế độ kho thật: BẮT BUỘC "claim" đủ số lượng bản ghi AVAILABLE
          // ngay trong transaction này (FOR UPDATE SKIP LOCKED để 2 checkout
          // chạy song song không bao giờ claim trúng cùng 1 bản ghi). Áp
          // dụng kể cả khi sản phẩm đang preOrder — không thể "giao trước"
          // 1 nội dung chưa thật sự tồn tại trong kho, khác hẳn chế độ cũ
          // (stock chỉ là con số, preOrder cho phép âm).
          const claimed = await tx.$queryRaw<{ id: string; content: string }[]>`
            SELECT id, content FROM "ProductStockItem"
            WHERE "productId" = ${product.id}
              AND "variantId" IS NOT DISTINCT FROM ${item.variantId ?? null}
              AND status = 'AVAILABLE'
            ORDER BY "createdAt" ASC
            LIMIT ${item.quantity}
            FOR UPDATE SKIP LOCKED
          `;
          if (claimed.length < item.quantity) {
            throw new Error(
              `"${displayLabel}" không đủ hàng trong kho (chỉ còn ${claimed.length}/${item.quantity}).`
            );
          }
          // Đánh dấu SOLD ngay lập tức (chưa gắn orderItemId — OrderItem
          // chưa được tạo) để chặn đúng trường hợp giỏ hàng có 2 dòng trùng
          // productId+variantId (gửi thẳng lên API, không qua CartContext
          // dedup) claim trúng cùng 1 bản ghi ở vòng lặp kế tiếp.
          await tx.productStockItem.updateMany({
            where: { id: { in: claimed.map((c) => c.id) } },
            data: { status: "SOLD", soldAt: new Date() },
          });
          claimedStockItemIds = claimed.map((c) => c.id);
          deliveredPayload = JSON.stringify(claimed.map((c) => c.content));
        } else if (!product.preOrder) {
          if (item.variantId) {
            if (variant!.stock < item.quantity) {
              throw new Error(`"${displayLabel}" không đủ tồn kho.`);
            }
          } else if (product.stock < item.quantity) {
            throw new Error(`"${product.name}" không đủ tồn kho.`);
          }
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
          claimedStockItemIds,
          deliveredPayload,
          // Chỉ cần trừ kho có điều kiện khi dùng kho số học + không preOrder.
          // Kho thật đã claim nguyên tử ở trên; preOrder cho phép âm.
          guardLegacyStock: stockItemTotal === 0 && !product.preOrder,
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

        // Tăng usedCount CÓ ĐIỀU KIỆN + nguyên tử (bug B5): where lồng điều
        // kiện "vẫn còn lượt / còn active" vào chính lệnh UPDATE — 2 checkout
        // song song dùng mã maxUses=1 thì chỉ đúng 1 lệnh khớp where (count=1),
        // lệnh kia count=0 → throw. isDiscountCodeUsable() ở trên chỉ là
        // fast-fail UX, KHÔNG còn là chốt chặn maxUses.
        const bumped = await tx.discountCode.updateMany({
          where: {
            id: discount.id,
            active: true,
            OR: [{ maxUses: null }, { usedCount: { lt: discount.maxUses ?? 0 } }],
          },
          data: { usedCount: { increment: 1 } },
        });
        if (bumped.count === 0) {
          throw new Error("Mã giảm giá đã hết lượt sử dụng.");
        }
      }

      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: session!.user.id },
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
        },
      });

      // Tạo từng OrderItem TUẦN TỰ (không dùng nested `items: { create: [...] }`
      // như trước) để lấy được đúng id của từng OrderItem ngay sau khi tạo —
      // cần thiết để gắn orderItemId cho đúng lô ProductStockItem đã claim ở
      // trên (thứ tự trả về của include:{items:true} không đảm bảo khớp thứ
      // tự mảng gốc, không thể tin tưởng để ghép cặp chính xác).
      for (const item of itemsToCreate) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            sellerId: item.sellerId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            status: "ESCROW",
            escrowReleaseAt,
            deliveredPayload: item.deliveredPayload,
          },
        });

        if (item.claimedStockItemIds.length > 0) {
          await tx.productStockItem.updateMany({
            where: { id: { in: item.claimedStockItemIds } },
            data: { orderItemId: orderItem.id },
          });
        }

        // Trừ kho: dòng "kho số học không preOrder" (guardLegacyStock) phải
        // trừ CÓ ĐIỀU KIỆN (where stock >= quantity) để chặn oversell khi 2
        // buyer mua song song đơn vị cuối (bug B3) — updateMany trả count=0
        // nếu không đủ → throw, rollback cả transaction. Dòng đã claim kho
        // thật hoặc preOrder thì trừ vô điều kiện như cũ (đã nguyên tử/cho âm).
        if (item.variantId) {
          if (item.guardLegacyStock) {
            const dec = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
            });
            if (dec.count === 0) {
              throw new Error(`"${item.productName}" không đủ tồn kho.`);
            }
          } else {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
            });
          }
        } else {
          if (item.guardLegacyStock) {
            const dec = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
            });
            if (dec.count === 0) {
              throw new Error(`"${item.productName}" không đủ tồn kho.`);
            }
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
            });
          }
        }
      }

      // Trừ ví CÓ ĐIỀU KIỆN + nguyên tử (bug B1): where "walletBalance >= total"
      // nằm trong chính lệnh UPDATE → 2 checkout song song của cùng 1 user
      // không thể cùng tiêu vượt số dư (lệnh thứ 2 re-evaluate where trên số dư
      // đã commit của lệnh 1 → count=0 → throw). Check ở dòng 206 chỉ là fast-fail.
      const walletDec = await tx.user.updateMany({
        where: { id: buyer.id, walletBalance: { gte: total } },
        data: { walletBalance: { decrement: total } },
      });
      if (walletDec.count === 0) {
        throw new Error("Số dư ví không đủ để thanh toán đơn hàng này.");
      }

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
      // Bug B7 (phần an toàn): chặn tự giới thiệu chính mình (referredById ===
      // buyer.id) — defense-in-depth, không để 1 user tự cộng hoa hồng cho ví
      // của chính mình. LƯU Ý: đây CHƯA chặn được farming đa tài khoản
      // (A giới thiệu B, cùng 1 người) — việc đó cần quyết định nghiệp vụ
      // (đặt trần hoa hồng / chỉ trả khi đơn RELEASED). Xem AUDIT.md B7.
      if (buyer.referredById && buyer.referredById !== buyer.id) {
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
