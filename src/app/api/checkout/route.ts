import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { ESCROW_HOLD_DAYS, MAX_CHECKOUT_ITEM_QUANTITY, SERVICE_DELIVERY_METHODS } from "@/lib/constants";
import { accrueCommission } from "@/lib/commission";
import { feeAmountOf, getEffectiveFeePercent, getEffectiveFeePercentPerSeller } from "@/lib/platform-fee";
import { computeDiscountAmount, distributeDiscount, isDiscountCodeUsable } from "@/lib/discount";
import { computeEffectivePrice } from "@/lib/mega-sale";
import { generateOrderCode, ORDER_CODE_MAX_RETRIES } from "@/lib/order-code";
import { notifySellerOutOfStock } from "@/lib/notify-seller";
import { logOrderStatusChange } from "@/lib/order-status-history";
import { computeProratedPrice } from "@/lib/prorate";
import { encryptSensitiveFields } from "@/lib/service-crypto";
import { splitServiceFieldValues } from "@/lib/service-intake";
import { toWarrantyHours } from "@/lib/warranty";
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
    if (
      !item.productId ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_CHECKOUT_ITEM_QUANTITY
    ) {
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
    // Gom lại trong lúc chạy transaction, gửi Telegram THẬT sau khi commit
    // thành công (xem lý do ở chỗ push bên dưới) — khai báo NGOÀI transaction
    // để không mất dữ liệu nếu transaction phải retry (đổi orderCode) do
    // trùng mã, đảm bảo mỗi lần thử lại bắt đầu từ mảng rỗng.
    const outOfStockNotifications: { sellerId: string; productName: string }[] = [];
    try {
      const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
        include: { variants: true, seller: { select: { suspended: true, level: true } }, serverDetail: true },
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
        // TOOL: metadata mã hoá {iv,authTag,keyVersion}|null theo từng đơn vị
        // — JSON mảng cùng thứ tự với deliveredPayload, null nếu không mã hoá.
        deliveredPayloadEncryption: string | null;
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
        // SNAPSHOT bảo hành (Product.warrantyValue/warrantyUnit quy đổi ra
        // giờ) TẠI THỜI ĐIỂM MUA — xem OrderItem.warrantyHours trong
        // schema.prisma. Seller sửa lại sản phẩm sau đó KHÔNG ảnh hưởng đơn
        // đã tạo (chống cướp quyền khiếu nại buyer).
        warrantyHours: number;
        // Đặt trước — SNAPSHOT Product.preOrder + hạn giao tại thời điểm mua
        // (xem OrderItem.isPreOrder/deliveryDeadline trong schema.prisma).
        isPreOrder: boolean;
        deliveryDeadline: Date | null;
        // Giao thủ công (VPS/Server) — TÁCH RIÊNG khỏi isPreOrder/deliveryDeadline
        // ở trên (build-separate theo quyết định đã chốt, xem
        // src/lib/manual-provision.ts). manualDeliveryDeadline = thời điểm mua +
        // ServerDetail.provisionSlaHours SNAPSHOT.
        isManualProvision: boolean;
        manualDeliveryDeadline: Date | null;
      }[] = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
        }
        // AUDIT LỖ HỔNG P0 (PRODUCT_LISTING_AUDIT.md #1) — checkout trước đây
        // KHÔNG kiểm tra status, cho phép mua thẳng sản phẩm PENDING/REJECTED
        // qua API dù trang chi tiết đã ẩn (chỉ chặn ở tầng hiển thị, không
        // chặn ở tầng giao dịch). Chặn CỨNG ở đây — tầng duy nhất tiền thật
        // sự bị trừ — trước khi đụng tới giá/kho/bất kỳ bước nào khác.
        if (product.status !== "APPROVED") {
          throw new Error(
            `"${product.name}" hiện chưa được duyệt hoặc đã bị từ chối, không thể mua.`
          );
        }
        if (!product.isActive) {
          throw new Error(`"${product.name}" hiện đã bị ẩn khỏi sàn, không thể mua.`);
        }
        // Seller tự tạm dừng bán, ĐỘC LẬP với số lượng kho (vd 1 lô hàng bị
        // lỗi mật khẩu nhưng Product.stock vẫn còn số lượng) — chặn CỨNG ở
        // đây, cùng nhóm với 3 điều kiện chặn cứng ở trên, để áp dụng cho MỌI
        // loại hàng (kể cả dịch vụ/TUT_TRICK/VPS thủ công và sản phẩm dùng
        // "kho thật" — 2 nhánh đó có luồng kiểm tra tồn kho RIÊNG, tách biệt
        // hoàn toàn khỏi điều kiện `product.stock < quantity` bên dưới, nên
        // không thể chỉ thêm điều kiện vào đúng chỗ đó). Khớp đúng hành vi
        // isOutOfStock() dùng ở UI (src/lib/stock-status.ts).
        if (product.pausedBySeller) {
          throw new Error(`"${product.name}" hiện đang hết hàng, không thể mua.`);
        }
        if (product.seller.suspended) {
          throw new Error(`Gian hàng bán "${product.name}" hiện đang bị tạm khoá, không thể mua.`);
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
        // Giao thủ công (VPS/Server) — cũng không có khái niệm "tồn kho"
        // (seller tự nhập credential theo TỪNG đơn sau khi thanh toán, không
        // claim/tiêu hao ProductStockItem). Ưu tiên CAO HƠN preOrder nếu
        // seller lỡ bật cả 2 cờ — 2 cơ chế hạn giao khác nhau không nên chồng
        // lên nhau, xem "isPreOrder" ép false bên dưới khi isManualProvision.
        const isManualProvision = product.deliveryMethod === "MANUAL_PROVISION";

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
        let deliveredPayloadEncryption: string | null = null;

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
            {
              id: string;
              content: string;
              contentEncryption: string | null;
              expiresAt: Date | null;
              nominalTermDays: number | null;
            }[]
          >`
            SELECT id, content, "contentEncryption", "expiresAt", "nominalTermDays" FROM "ProductStockItem"
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
          // TOOL: mang nguyên metadata mã hoá của (các) credential vừa claim
          // sang OrderItem — content ở deliveredPayload vẫn là ciphertext,
          // CHỈ giải mã trong POST /api/orders/[id]/reveal-delivered. null
          // cho mọi dòng không mã hoá (Sản phẩm kho/TUT-Trick — hành vi cũ).
          const hasAnyEncrypted = claimed.some((c) => c.contentEncryption !== null);
          deliveredPayloadEncryption = hasAnyEncrypted
            ? JSON.stringify(
                claimed.map((c) => (c.contentEncryption ? JSON.parse(c.contentEncryption) : null))
              )
            : null;

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
        } else if (isManualProvision) {
          // Ép quantity=1 — mỗi đơn VPS là 1 máy chủ do seller tự cấp phát
          // riêng, không có ý nghĩa "mua nhiều" như sản phẩm kho.
          if (item.quantity !== 1) {
            throw new Error(`"${displayLabel}" là VPS/Server — chỉ mua được số lượng 1 mỗi lần.`);
          }
          if (!product.serverDetail) {
            throw new Error(
              `"${displayLabel}" chưa được người bán cấu hình đủ thông tin máy chủ — vui lòng liên hệ người bán.`
            );
          }
          // deliveredPayload GIỮ NGUYÊN null — chưa có gì để giao, seller nhập
          // credential SAU khi thanh toán (xem POST /api/seller/orders/[id]/deliver-manual).
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

        // Đặt trước — SNAPSHOT lúc mua (xây lại 2026-08-14). isPreOrder đóng
        // băng Product.preOrder TẠI THỜI ĐIỂM NÀY (seller đổi cờ này sau khi
        // bán không ảnh hưởng đơn đã tạo — job giải ngân/hoàn tiền lọc theo
        // OrderItem.isPreOrder, không join ngược Product). Vẫn snapshot dù
        // dòng hàng này claim được kho thật ngay (deliveredPayload khác null)
        // — trường hợp đó tự nhiên được coi là "đã giao" ở mọi nơi kiểm tra
        // `deliveredPayload === null`, không cần tắt isPreOrder riêng.
        // MANUAL_PROVISION ép isPreOrder=false dù Product.preOrder có bật hay
        // không — 2 cơ chế hạn giao (deliveryDeadline vs manualDeliveryDeadline)
        // không dùng chung được, xem comment isManualProvision ở trên.
        const isPreOrder = !isManualProvision && product.preOrder;
        let deliveryDeadline: Date | null = null;
        if (isPreOrder) {
          if (product.preOrderDeliveryValue === null) {
            throw new Error(
              `"${displayLabel}" đang bật đặt trước nhưng người bán chưa cấu hình thời gian giao — vui lòng liên hệ người bán hoặc chọn sản phẩm khác.`
            );
          }
          // toWarrantyHours() chỉ là hàm thuần {value,unit} -> giờ, dùng lại
          // được cho thời gian giao (không có gì đặc thù "bảo hành" trong đó).
          const deliveryHours = toWarrantyHours(
            product.preOrderDeliveryValue,
            product.preOrderDeliveryUnit === "hour" ? "hour" : "day"
          );
          deliveryDeadline = new Date(Date.now() + deliveryHours * 3600_000);
        }

        // VPS/Server hỗ trợ CẢ HAI kiểu giao, phân nhánh theo NỘI DUNG KHO
        // (không theo deliveryMethod): kho CÓ dữ liệu → claimedStockItemIds
        // đã khác rỗng ở nhánh "if (stockItemTotal > 0)" phía trên, đơn giao
        // TỰ ĐỘNG y hệt mọi sản phẩm kho khác → KHÔNG được gắn
        // manualDeliveryDeadline (nếu không, đơn đã giao xong vẫn bị coi là
        // "chờ giao thủ công", có thể bị cron tự huỷ + hoàn tiền dù buyer đã
        // nhận hàng — lỗ hổng đã phát hiện, chặn tại đây). Chỉ đơn KHÔNG claim
        // được gì từ kho (claimedStockItemIds rỗng) mới thật sự đi luồng
        // MANUAL_PROVISION — = thời điểm mua + ServerDetail.provisionSlaHours
        // SNAPSHOT (seller sửa provisionSlaHours sau đó KHÔNG ảnh hưởng đơn
        // đã mua, cùng nguyên tắc deliveryDeadline/warrantyHours ở trên).
        const manualDeliveryDeadline = isManualProvision && claimedStockItemIds.length === 0
          ? new Date(Date.now() + product.serverDetail!.provisionSlaHours * 3600_000)
          : null;

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
          deliveredPayloadEncryption,
          serviceIntakeData,
          warrantyHours: toWarrantyHours(product.warrantyValue, product.warrantyUnit === "hour" ? "hour" : "day"),
          isPreOrder,
          deliveryDeadline,
          isManualProvision,
          manualDeliveryDeadline,
          // Chỉ cần trừ kho có điều kiện khi dùng kho số học + không preOrder +
          // không phải dịch vụ (dịch vụ không có tồn kho để trừ).
          // Kho thật đã claim nguyên tử ở trên; preOrder cho phép âm.
          guardLegacyStock:
            stockItemTotal === 0 && !product.preOrder && !isService && !isTutTrick && !isManualProvision,
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

      // Mặc định cho đơn THƯỜNG — đơn đặt trước dùng deliveryDeadline riêng
      // của từng dòng hàng thay cho mốc này (xem trong vòng lặp tạo OrderItem
      // bên dưới), vì mỗi dòng hàng có thể có thời gian giao khác nhau.
      const defaultEscrowReleaseAt = new Date();
      defaultEscrowReleaseAt.setDate(defaultEscrowReleaseAt.getDate() + ESCROW_HOLD_DAYS);

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
      // tố khi admin đổi % sau). Áp cho MỌI đơn/mọi seller. Biến này GIỮ
      // NGUYÊN ý nghĩa cũ — chỉ dùng cho accrueCommission() bên dưới (field
      // audit "marginPercentApplied", KHÔNG phải nguồn tính tiền hoa hồng
      // thật — số tiền thật luôn tính lại từ platformFeeAmount đã đóng băng
      // trên từng OrderItem lúc giải ngân, xem finalizeOrderCommission()).
      const feePercent = await getEffectiveFeePercent(tx);

      // Phí sàn THỰC ÁP cho từng dòng hàng — TRỪ theo hạng của ĐÚNG seller
      // dòng đó (Hạng người bán, mặc định feeDiscountPercent=0 mọi hạng nên
      // map này trả về giống hệt feePercent ở trên cho tới khi admin tự đặt
      // % giảm khác 0 — xem getEffectiveFeePercentPerSeller() trong
      // src/lib/platform-fee.ts). 1 đơn có thể gồm nhiều seller khác hạng
      // nhau nên KHÔNG thể dùng chung 1 con số như feePercent ở trên.
      const uniqueSellersInOrder = Array.from(
        new Map(products.map((p) => [p.sellerId, { id: p.sellerId, level: p.seller.level }])).values()
      );
      const sellerFeePercentMap = await getEffectiveFeePercentPerSeller(tx, feePercent, uniqueSellersInOrder);

      // Tạo từng OrderItem TUẦN TỰ (không dùng nested `items: { create: [...] }`
      // như trước) để lấy được đúng id của từng OrderItem ngay sau khi tạo —
      // cần thiết để gắn orderItemId cho đúng lô ProductStockItem đã claim ở
      // trên (thứ tự trả về của include:{items:true} không đảm bảo khớp thứ
      // tự mảng gốc, không thể tin tưởng để ghép cặp chính xác).
      for (const item of itemsToCreate) {
        // Phí sàn tính trên giá SAU giảm giá (item.price đã là đơn giá sau khi
        // áp mã giảm giá) × quantity. % dùng riêng theo hạng seller của dòng
        // hàng này (xem sellerFeePercentMap ở trên) — fallback feePercent gốc
        // nếu vì lý do gì đó không có trong map (không nên xảy ra, phòng thủ).
        const lineBase = item.price * item.quantity;
        const sellerFeePercent = sellerFeePercentMap.get(item.sellerId) ?? feePercent;
        const platformFeeAmount = feeAmountOf(lineBase, sellerFeePercent);
        // Đặt trước: escrowReleaseAt = deliveryDeadline (KHÔNG phải mặc định
        // ESCROW_HOLD_DAYS) — job giải ngân (POST /api/admin/escrow/release)
        // dùng chính mốc này để biết khi nào đơn "đến hạn xét duyệt" (rồi tự
        // chặn giải ngân nếu vẫn chưa giao, xem isPreOrder check ở đó). Sau
        // khi seller giao + buyer nhận, warrantyExpiresAt (tính từ receivedAt)
        // sẽ vượt qua mốc này và getEffectiveEscrowReleaseAt() tự gia hạn
        // đúng theo bảo hành — không cần code riêng cho giai đoạn đó.
        // Giao thủ công (VPS): escrowReleaseAt = manualDeliveryDeadline, MIRROR
        // đúng cách đặt trước dùng deliveryDeadline (đã grep xác nhận an toàn
        // trước khi viết SQL — xem prisma/pending-sql/2026-08-21-manual-provisioning.sql):
        // đơn chỉ thật sự vào vòng xét giải ngân SAU KHI status chuyển sang
        // ESCROW (seller đã nhập credential), lúc đó lưới an toàn auto-confirm
        // trong releaseDueEscrow() + MIN_WARRANTY_HOURS_PRODUCT đảm bảo buyer
        // luôn có cửa sổ bảo hành thật trước khi giải ngân.
        const escrowReleaseAt = item.isManualProvision && item.manualDeliveryDeadline
          ? item.manualDeliveryDeadline
          : item.isPreOrder && item.deliveryDeadline
            ? item.deliveryDeadline
            : defaultEscrowReleaseAt;
        // Nguồn sự thật DUY NHẤT cho quyết định "đơn này có cần seller giao
        // tay hay không" — dùng manualDeliveryDeadline (đã null hoá ở trên
        // khi kho có claim được nội dung) thay vì isManualProvision (chỉ là
        // cấu hình Product, không phản ánh đơn NÀY có hàng sẵn trong kho hay
        // không).
        const initialStatus = item.manualDeliveryDeadline ? "AWAITING_SELLER_DELIVERY" : "ESCROW";
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
            status: initialStatus,
            escrowReleaseAt,
            deliveredPayload: item.deliveredPayload,
            deliveredExpiresAt: item.deliveredExpiresAt,
            deliveredPayloadEncryption: item.deliveredPayloadEncryption,
            platformFeePercent: sellerFeePercent,
            platformFeeAmount,
            warrantyHours: item.warrantyHours,
            isPreOrder: item.isPreOrder,
            deliveryDeadline: item.deliveryDeadline,
            manualDeliveryDeadline: item.manualDeliveryDeadline,
          },
        });

        // AUDIT LỖ HỔNG 3 — dòng khởi tạo lịch sử trạng thái (fromStatus null).
        await logOrderStatusChange(tx, {
          orderItemId: orderItem.id,
          fromStatus: null,
          toStatus: initialStatus,
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
        let stockAfterDecrement: number | null = null;
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
          stockAfterDecrement = (
            await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } })
          )?.stock ?? null;
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
          stockAfterDecrement = (
            await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } })
          )?.stock ?? null;
        }

        // Báo seller khi kho VỪA chạm 0 (Quy tắc "hết hàng") — CHỈ cho dòng
        // hàng mà stock thật sự là tín hiệu tồn kho (loại trừ preOrder/dịch
        // vụ/VPS-thủ-công, giống hệt điều kiện isOutOfStock() dùng ở UI, xem
        // src/lib/stock-status.ts). "Vừa chạm 0" = stockAfterDecrement<=0 VÀ
        // trước lần trừ này còn dương (stockAfterDecrement + quantity > 0) —
        // tránh gửi lặp lại ở mọi đơn mua sau khi đã về 0/âm từ trước.
        const eligibleForOutOfStockNotify =
          !item.isPreOrder &&
          !item.isManualProvision &&
          !item.serviceIntakeData &&
          (item.guardLegacyStock || item.claimedStockItemIds.length > 0);
        if (
          eligibleForOutOfStockNotify &&
          stockAfterDecrement !== null &&
          stockAfterDecrement <= 0 &&
          stockAfterDecrement + item.quantity > 0
        ) {
          // Chỉ GOM lại ở đây (không gọi Telegram ngay) — gọi network I/O
          // bên trong transaction DB là rủi ro (giữ connection lâu/không đảm
          // bảo chạy xong nếu transaction rollback). Gửi thật SAU KHI
          // transaction commit thành công, xem dưới cuối hàm.
          outOfStockNotifications.push({ sellerId: item.sellerId, productName: item.productName });
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

      // Gửi thông báo "hết hàng" cho seller SAU KHI đơn đã tạo thành công —
      // best-effort, KHÔNG được để lỗi gửi Telegram làm fail response
      // checkout (buyer đã trả tiền thành công, đơn đã tạo xong).
      for (const n of outOfStockNotifications) {
        const seller = await prisma.seller.findUnique({
          where: { id: n.sellerId },
          select: { telegramChatId: true, telegramLinkCode: true },
        });
        if (seller) {
          await notifySellerOutOfStock(seller, n.productName).catch(() => {});
        }
      }

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
