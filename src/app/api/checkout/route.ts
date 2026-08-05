import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { ESCROW_HOLD_DAYS, SERVICE_DELIVERY_METHODS } from "@/lib/constants";
import { accrueCommission } from "@/lib/commission";
import { feeAmountOf, getEffectiveFeePercent } from "@/lib/platform-fee";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { computeEffectivePrice } from "@/lib/mega-sale";
import { generateOrderCode, ORDER_CODE_MAX_RETRIES } from "@/lib/order-code";
import { logOrderStatusChange } from "@/lib/order-status-history";
import { computeProratedPrice } from "@/lib/prorate";
import { encryptSensitiveFields } from "@/lib/service-crypto";
import { splitServiceFieldValues } from "@/lib/service-intake";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  // Chỉ cần khi sản phẩm là dịch vụ (product.productType === "SERVICE") —
  // xem model ServiceIntake. `values` khớp theo fieldKey của
  // ServiceFieldDefinition đã seller khai cho đúng sản phẩm này.
  serviceInput?: { deliveryMethod: string; values?: Record<string, string>; note?: string };
};

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

  // orderCode sinh MỖI LẦN THỬ, ngoài phạm vi transaction bên trong — nếu
  // trùng (unique-violation P2002 trên orderCode, xác suất cực thấp nhưng
  // vẫn xử lý cho chắc, xem src/lib/order-code.ts), Postgres đã huỷ toàn bộ
  // transaction đó, phải retry lại TOÀN BỘ chứ không thể "đổi mã rồi thử lại
  // tại chỗ" như ensureReferralCode() (hàm đó không nằm trong transaction).
  for (let attempt = 0; attempt < ORDER_CODE_MAX_RETRIES; attempt++) {
    const orderCode = generateOrderCode();
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
        // Snapshot ngày hết hạn của (các) đơn vị đã claim — JSON mảng cùng
        // cấu trúc/thứ tự với deliveredPayload, null nếu không dùng kho thật.
        deliveredExpiresAt: string | null;
        // Dữ liệu buyer cung cấp cho dòng hàng DỊCH VỤ (xem model
        // ServiceIntake) — null nếu không phải dịch vụ. Tạo SAU khi có
        // orderItem.id nên chỉ mang theo dữ liệu đã chuẩn bị sẵn (mã hoá rồi)
        // qua bước tạo OrderItem bên dưới.
        serviceIntakeData: {
          deliveryMethod: string;
          publicFields: string | null;
          encryptedFields: string | null;
          encryptionIv: string | null;
          encryptionAuthTag: string | null;
          encryptionKeyVersion: number | null;
          preHandoffSnapshot: string | null;
        } | null;
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
        // Dịch vụ không có khái niệm "tồn kho" (buyer đặt lượt thực hiện, không
        // trừ đơn vị hàng có sẵn) — Product.stock của dịch vụ luôn để 0 và
        // KHÔNG được dùng để chặn/trừ như sản phẩm thường.
        const isService = product.productType === "SERVICE";
        // TUT_TRICK: bán nội dung hướng dẫn CỐ ĐỊNH, lặp lại vô hạn cho nhiều
        // buyer — cũng không có khái niệm "tồn kho" như dịch vụ (không claim/
        // tiêu hao ProductStockItem, không trừ Product.stock có điều kiện).
        const isTutTrick = product.productType === "TUT_TRICK";

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

        // Mega Sale (seller tự cấu hình, xem src/lib/mega-sale.ts) — áp dụng
        // cho GIÁ NIÊM YẾT ngay tại đây, TRƯỚC bước prorate theo hạn dùng bên
        // dưới (2 cơ chế không đá nhau: prorate co tiếp giá ĐÃ sale theo %
        // ngày còn lại, không co giá gốc chưa sale). Kiểu FIXED chỉ hợp lệ
        // cho sản phẩm giá đơn không variant (validate lúc seller cấu hình ở
        // PATCH /api/seller/products/[productId]) — phòng thủ thêm ở đây:
        // bỏ qua FIXED nếu đang tính giá 1 variant cụ thể, vì 1 giá cố định
        // không thể áp chung cho nhiều variant khác giá nhau.
        const megaSaleAppliesHere = !(item.variantId && product.megaSaleType === "FIXED");
        if (megaSaleAppliesHere) {
          unitPrice = computeEffectivePrice(unitPrice, {
            megaSaleActive: product.megaSaleActive,
            megaSaleType: product.megaSaleType,
            megaSalePercent: product.megaSalePercent,
            megaSaleFixedPrice: product.megaSaleFixedPrice,
            megaSaleEndsAt: product.megaSaleEndsAt,
          }).price;
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

        let deliveredExpiresAt: string | null = null;

        if (stockItemTotal > 0) {
          // Chế độ kho thật: BẮT BUỘC "claim" đủ số lượng bản ghi AVAILABLE
          // ngay trong transaction này (FOR UPDATE SKIP LOCKED để 2 checkout
          // chạy song song không bao giờ claim trúng cùng 1 bản ghi). Áp
          // dụng kể cả khi sản phẩm đang preOrder — không thể "giao trước"
          // 1 nội dung chưa thật sự tồn tại trong kho, khác hẳn chế độ cũ
          // (stock chỉ là con số, preOrder cho phép âm).
          //
          // Điều kiện "expiresAt" IS NULL OR "expiresAt" > NOW() là cơ chế
          // TỰ ĐỘNG loại đơn vị đã hết hạn khỏi diện có thể bán — không cần
          // cron/job nền, chỉ là điều kiện lọc tính lại mỗi lần checkout
          // (xem model ProductStockItem, mục "Thời hạn sử dụng sản phẩm").
          const claimed = await tx.$queryRaw<
            { id: string; content: string; expiresAt: Date | null; nominalTermDays: number | null }[]
          >`
            SELECT id, content, "expiresAt", "nominalTermDays" FROM "ProductStockItem"
            WHERE "productId" = ${product.id}
              AND "variantId" IS NOT DISTINCT FROM ${item.variantId ?? null}
              AND status = 'AVAILABLE'
              AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
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
          deliveredExpiresAt = JSON.stringify(
            claimed.map((c) => c.expiresAt?.toISOString() ?? null)
          );

          // Prorate giá theo từng đơn vị CÓ thời hạn (đơn vị không thời hạn
          // giữ nguyên unitPrice gốc). Cộng thành lineTotal rồi floor-chia
          // lại cho quantity — tái dùng đúng kỹ thuật chống lệch làm tròn đã
          // có trong distributeDiscount() (src/lib/discount.ts): toàn bộ
          // codebase (phí sàn, hoa hồng, doanh thu, hoàn tiền khiếu nại...)
          // đều giả định unitPrice * quantity = tổng tiền dòng hàng, nên
          // KHÔNG thể lưu nhiều giá khác nhau cho cùng 1 OrderItem — phải
          // gộp về đúng 1 con số nguyên trước khi tạo OrderItem.
          const hasAnyTimed = claimed.some((c) => c.expiresAt !== null);
          if (hasAnyTimed) {
            const lineTotal = claimed.reduce((sum, c) => {
              if (!c.expiresAt) return sum + unitPrice;
              const nominal = c.nominalTermDays ?? 1;
              return sum + computeProratedPrice(unitPrice, nominal, c.expiresAt).price;
            }, 0);
            unitPrice = Math.floor(lineTotal / item.quantity);
          }
        } else if (isTutTrick) {
          // TUT_TRICK: nội dung hướng dẫn CỐ ĐỊNH, bán được nhiều lần cho
          // nhiều buyer khác nhau — KHÔNG claim/tiêu hao gì, set thẳng
          // deliveredPayload từ Product.tutTrickContent mỗi lần mua (y hệt
          // cơ chế deliveredPayload của kho thật, chỉ khác là nội dung không
          // đổi qua từng lượt bán). Ép quantity=1 — mua nhiều "bản" cùng 1
          // bài hướng dẫn không có ý nghĩa, giống quy tắc đã áp cho dịch vụ.
          if (item.quantity !== 1) {
            throw new Error(
              `"${displayLabel}" là nội dung hướng dẫn — chỉ mua được số lượng 1 mỗi lần.`
            );
          }
          if (!product.tutTrickContent) {
            throw new Error(
              `"${displayLabel}" chưa có nội dung hướng dẫn, vui lòng liên hệ người bán.`
            );
          }
          deliveredPayload = JSON.stringify([product.tutTrickContent]);
        } else if (!product.preOrder && !isService) {
          if (item.variantId) {
            if (variant!.stock < item.quantity) {
              throw new Error(`"${displayLabel}" không đủ tồn kho.`);
            }
          } else if (product.stock < item.quantity) {
            throw new Error(`"${product.name}" không đủ tồn kho.`);
          }
        }

        // Dịch vụ: buyer PHẢI cung cấp đủ thông tin seller cần để thực hiện —
        // xem model ServiceFieldDefinition/ServiceIntake. Field "secret" (mật
        // khẩu/OTP) mã hoá NGAY tại đây, TRƯỚC khi tạo OrderItem — không bao
        // giờ có thời điểm nào plaintext của field secret được ghi vào biến
        // ngoài phạm vi hàm encryptSensitiveFields().
        let serviceIntakeData:
          | (typeof itemsToCreate)[number]["serviceIntakeData"]
          | null = null;
        if (product.productType === "SERVICE") {
          if (item.quantity !== 1) {
            throw new Error(
              `"${displayLabel}" là dịch vụ — chỉ đặt được số lượng 1 mỗi lần, vui lòng đặt riêng nếu cần nhiều lượt.`
            );
          }
          const allowedMethods: string[] = product.serviceDeliveryMethods
            ? JSON.parse(product.serviceDeliveryMethods)
            : [];
          const chosenMethod = item.serviceInput?.deliveryMethod;
          if (
            !chosenMethod ||
            !allowedMethods.includes(chosenMethod) ||
            !(SERVICE_DELIVERY_METHODS as readonly string[]).includes(chosenMethod)
          ) {
            throw new Error(`Vui lòng chọn phương thức bàn giao hợp lệ cho "${displayLabel}".`);
          }

          const fieldDefs = await tx.serviceFieldDefinition.findMany({
            where: { productId: product.id },
            orderBy: { sortOrder: "asc" },
          });
          if (fieldDefs.length === 0) {
            throw new Error(
              `"${displayLabel}" chưa được người bán cấu hình đủ thông tin cần thiết — vui lòng liên hệ người bán.`
            );
          }
          const { publicFields, secretFields, missingLabels } = splitServiceFieldValues(
            fieldDefs,
            item.serviceInput?.values ?? {}
          );
          if (missingLabels.length > 0) {
            throw new Error(`Vui lòng nhập đủ thông tin: ${missingLabels.join(", ")}.`);
          }

          let encrypted: ReturnType<typeof encryptSensitiveFields> | null = null;
          if (Object.keys(secretFields).length > 0) {
            try {
              encrypted = encryptSensitiveFields(secretFields);
            } catch {
              // Không log chi tiết lỗi gốc (tránh rò rỉ thông tin nội bộ) —
              // đây LÀ nhánh fail-closed bắt buộc khi thiếu
              // SERVICE_CREDENTIAL_ENCRYPTION_KEY, xem src/lib/service-crypto.ts.
              throw new Error(
                "Hệ thống chưa sẵn sàng nhận đơn dịch vụ có thông tin nhạy cảm lúc này, vui lòng thử lại sau hoặc liên hệ hỗ trợ."
              );
            }
          }

          const note = typeof item.serviceInput?.note === "string" ? item.serviceInput.note.trim() : "";

          serviceIntakeData = {
            deliveryMethod: chosenMethod,
            publicFields: Object.keys(publicFields).length > 0 ? JSON.stringify(publicFields) : null,
            encryptedFields: encrypted?.ciphertext ?? null,
            encryptionIv: encrypted?.iv ?? null,
            encryptionAuthTag: encrypted?.authTag ?? null,
            encryptionKeyVersion: encrypted?.keyVersion ?? null,
            preHandoffSnapshot: note ? JSON.stringify({ note }) : null,
          };
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
          deliveredExpiresAt,
          serviceIntakeData,
          // Chỉ cần trừ kho có điều kiện khi dùng kho số học + không preOrder +
          // không phải dịch vụ (dịch vụ không có tồn kho để trừ).
          // Kho thật đã claim nguyên tử ở trên; preOrder cho phép âm.
          guardLegacyStock: stockItemTotal === 0 && !product.preOrder && !isService && !isTutTrick,
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
          orderCode,
          buyerId: buyer.id,
          totalAmount: total,
          status: "ESCROW",
          discountCode: appliedDiscountCode,
          discountAmount,
        },
      });

      // Phí sàn: % HIỆU LỰC tại thời điểm đặt đơn (lịch phí đang áp, else mặc
      // định) — tính hoàn toàn ở server, freeze vào từng OrderItem (không hồi
      // tố khi admin đổi % sau). Áp cho MỌI đơn/mọi seller.
      const feePercent = await getEffectiveFeePercent(tx);

      // Tạo từng OrderItem TUẦN TỰ (không dùng nested `items: { create: [...] }`
      // như trước) để lấy được đúng id của từng OrderItem ngay sau khi tạo —
      // cần thiết để gắn orderItemId cho đúng lô ProductStockItem đã claim ở
      // trên (thứ tự trả về của include:{items:true} không đảm bảo khớp thứ
      // tự mảng gốc, không thể tin tưởng để ghép cặp chính xác).
      for (const item of itemsToCreate) {
        // Phí sàn tính trên giá SAU giảm giá (item.price đã là đơn giá sau khi
        // áp mã giảm giá) × quantity.
        const lineBase = item.price * item.quantity;
        const platformFeeAmount = feeAmountOf(lineBase, feePercent);
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
            deliveredExpiresAt: item.deliveredExpiresAt,
            platformFeePercent: feePercent,
            platformFeeAmount,
          },
        });

        // AUDIT LỖ HỔNG 3 — dòng khởi tạo lịch sử trạng thái (fromStatus null).
        await logOrderStatusChange(tx, {
          orderItemId: orderItem.id,
          fromStatus: null,
          toStatus: "ESCROW",
          actor: { type: "BUYER", id: buyer.id },
          note: "Đặt đơn",
        });

        if (item.claimedStockItemIds.length > 0) {
          await tx.productStockItem.updateMany({
            where: { id: { in: item.claimedStockItemIds } },
            data: { orderItemId: orderItem.id },
          });
        }

        if (item.serviceIntakeData) {
          await tx.serviceIntake.create({
            data: {
              orderItemId: orderItem.id,
              deliveryMethod: item.serviceIntakeData.deliveryMethod,
              publicFields: item.serviceIntakeData.publicFields,
              encryptedFields: item.serviceIntakeData.encryptedFields,
              encryptionIv: item.serviceIntakeData.encryptionIv,
              encryptionAuthTag: item.serviceIntakeData.encryptionAuthTag,
              encryptionKeyVersion: item.serviceIntakeData.encryptionKeyVersion,
              preHandoffSnapshot: item.serviceIntakeData.preHandoffSnapshot,
            },
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
          // AUDIT LỖ HỔNG 1 — khoá ngoại thật (không chỉ nối qua note). Áp
          // dụng cho CẢ đơn (không phải 1 dòng hàng cụ thể) nên chỉ gắn
          // orderId, không gắn orderItemId.
          orderId: createdOrder.id,
        },
      });

      // Hoa hồng affiliate (B7 làm lại): CHỈ GHI NHẬN (PENDING), KHÔNG cộng ví
      // lúc tạo đơn. Chỉ đủ điều kiện giải ngân khi đơn RELEASED (qua cửa sổ ký
      // quỹ/khiếu nại) — xem finalizeOrderCommission() gọi ở escrow release/
      // dispute, và admin giải ngân thủ công tại Admin > Hoa hồng. accrueCommission
      // tự chặn self-referral, yêu cầu đã nạp tiền thật, và gắn cờ trùng IP.
      if (buyer.referredById) {
        await accrueCommission(tx, {
          orderId: createdOrder.id,
          buyerId: buyer.id,
          referrerId: buyer.referredById,
          orderTotal: total,
          feePercent,
        });
      }

      return createdOrder;
      });

      return NextResponse.json({ orderId: order.id, orderCode: order.orderCode });
    } catch (err) {
      // Trùng orderCode (P2002 trên đúng cột này) — thử lại với mã mới thay
      // vì trả lỗi ngay, xác suất cực thấp nên retry gần như luôn thành
      // công ở lần thứ 2. Mọi lỗi khác (kể cả hết lượt retry) trả lỗi bình
      // thường như trước.
      const isOrderCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        Array.isArray((err.meta as { target?: unknown })?.target) &&
        (err.meta!.target as string[]).includes("orderCode");
      if (isOrderCodeCollision && attempt < ORDER_CODE_MAX_RETRIES - 1) {
        continue;
      }
      const message = err instanceof Error ? err.message : "Tạo đơn hàng thất bại.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Tạo đơn hàng thất bại, vui lòng thử lại." }, { status: 500 });
}
