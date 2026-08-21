import { NextResponse } from "next/server";
import { requireSeller, requireSellerRateLimited } from "@/lib/authz";
import {
  DELIVERY_METHODS,
  DUPLICATE_PRODUCT_WINDOW_HOURS,
  MAX_PRODUCT_PRICE_VND,
  MAX_PRODUCT_STOCK,
  MIN_PROVISION_SLA_HOURS,
  MIN_WARRANTY_HOURS_PRODUCT,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SHORT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_SHORT_DESCRIPTION_MIN_LENGTH,
  SELLER_PRODUCT_CREATE_LIMIT,
  SELLER_PRODUCT_CREATE_WINDOW_MS,
  SERVER_BILLING_CYCLES,
  SERVER_KINDS,
  SERVICE_CREDENTIAL_MAX_WINDOW_HOURS,
  SERVICE_CREDENTIAL_MIN_WINDOW_HOURS,
  SERVICE_DELIVERY_METHODS,
  SERVICE_FIELD_INPUT_TYPES,
  SERVICE_FIELDS_MAX_COUNT,
  type WarrantyUnit,
} from "@/lib/constants";
import { getMySellerProducts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { slugifyFieldKey, slugifyProduct } from "@/lib/slug";
import { saveProductImage } from "@/lib/uploads";
import { toWarrantyHours } from "@/lib/warranty";

export async function GET() {
  const { session, error } = await requireSeller();
  if (error) return error;

  const products = await getMySellerProducts(session!.user.id);
  return NextResponse.json({ products });
}

// Seller tự đăng sản phẩm mới — luôn tạo với status "PENDING", cần admin
// duyệt (POST /api/admin/products/[id]) mới hiện công khai trên site. Đây
// là lần đầu tiên seller tạo được SẢN PHẨM GỐC mới (trước đây chỉ thêm được
// phiên bản/variant cho sản phẩm có sẵn qua /quan-ly-san-pham).
export async function POST(req: Request) {
  // Rate-limit theo seller (PRODUCT_LISTING_AUDIT.md #2) — chặn spam đăng
  // hàng loạt sản phẩm PENDING làm ngập hàng chờ duyệt admin.
  const { seller, error } = await requireSellerRateLimited(
    "seller-products-create",
    SELLER_PRODUCT_CREATE_LIMIT,
    SELLER_PRODUCT_CREATE_WINDOW_MS
  );
  if (error) return error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const shortDescription = String(form.get("shortDescription") ?? "").trim();
  const descriptionRaw = String(form.get("description") ?? "").trim();
  const priceRaw = form.get("price");
  const stockRaw = form.get("stock");
  const image = form.get("image");

  if (name.length < PRODUCT_NAME_MIN_LENGTH || name.length > PRODUCT_NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Tên sản phẩm phải từ ${PRODUCT_NAME_MIN_LENGTH}-${PRODUCT_NAME_MAX_LENGTH} ký tự.` },
      { status: 400 }
    );
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Vui lòng chọn danh mục." }, { status: 400 });
  }
  if (
    shortDescription.length < PRODUCT_SHORT_DESCRIPTION_MIN_LENGTH ||
    shortDescription.length > PRODUCT_SHORT_DESCRIPTION_MAX_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Mô tả ngắn phải từ ${PRODUCT_SHORT_DESCRIPTION_MIN_LENGTH}-${PRODUCT_SHORT_DESCRIPTION_MAX_LENGTH} ký tự.`,
      },
      { status: 400 }
    );
  }
  // PRODUCT_LISTING_AUDIT.md #6 — trước đây KHÔNG có trần tối đa cho mô tả
  // chi tiết.
  if (
    descriptionRaw.length < PRODUCT_DESCRIPTION_MIN_LENGTH ||
    descriptionRaw.length > PRODUCT_DESCRIPTION_MAX_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `Mô tả chi tiết phải từ ${PRODUCT_DESCRIPTION_MIN_LENGTH}-${PRODUCT_DESCRIPTION_MAX_LENGTH.toLocaleString("vi-VN")} ký tự.`,
      },
      { status: 400 }
    );
  }

  // PRODUCT_LISTING_AUDIT.md #3 — chặn đăng trùng NHẸ NHÀNG: chỉ chặn khi
  // CHÍNH seller này vừa đăng đúng tên đó (không phân biệt hoa/thường) và
  // bản ghi cũ còn PENDING/APPROVED trong DUPLICATE_PRODUCT_WINDOW_HOURS gần
  // nhất — không chặn nếu bản ghi cũ đã REJECTED (seller sửa và đăng lại sau
  // khi bị từ chối là hợp lệ) hoặc đã quá lâu (đăng lại hàng đã hết/bán tiếp
  // tuần sau là bình thường, không phải spam). Không áp dụng giữa các seller
  // khác nhau — trùng tên giữa 2 gian hàng là chuyện thường.
  const duplicateSince = new Date(Date.now() - DUPLICATE_PRODUCT_WINDOW_HOURS * 3600_000);
  const duplicate = await prisma.product.findFirst({
    where: {
      sellerId: seller!.id,
      name: { equals: name, mode: "insensitive" },
      status: { in: ["PENDING", "APPROVED"] },
      createdAt: { gte: duplicateSince },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Bạn đã đăng sản phẩm "${name}" gần đây và đang chờ duyệt/đã duyệt. Vui lòng đợi hoặc đổi tên nếu đây là sản phẩm khác.`,
      },
      { status: 400 }
    );
  }
  // PRODUCT_LISTING_AUDIT.md #5 — price trước đây chỉ check Number.isFinite
  // (Product.price là cột Int trong Postgres), giá trị thập phân/vượt Int32
  // lọt qua rồi gây lỗi runtime không kiểm soát lúc ghi DB. Giờ ép nguyên +
  // chặn trần hợp lý.
  const price = Number(priceRaw);
  if (!Number.isInteger(price) || price < 1000 || price > MAX_PRODUCT_PRICE_VND) {
    return NextResponse.json(
      {
        error: `Giá phải là số nguyên, từ 1.000đ đến ${MAX_PRODUCT_PRICE_VND.toLocaleString("vi-VN")}đ.`,
      },
      { status: 400 }
    );
  }
  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_PRODUCT_STOCK) {
    return NextResponse.json(
      { error: `Kho phải là số nguyên từ 0 đến ${MAX_PRODUCT_STOCK.toLocaleString("vi-VN")}.` },
      { status: 400 }
    );
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh sản phẩm." }, { status: 400 });
  }

  // Dịch vụ: buyer phải cung cấp thông tin (tài khoản/link/mật khẩu...) cho
  // seller thực hiện — xem model ServiceFieldDefinition. TUT_TRICK: bán nội
  // dung hướng dẫn/kiến thức, bán lặp lại vô hạn — xem Product.tutTrickContent.
  // TOOL: Tool/AI Agent — kho credential MÃ HOÁ (kiểu B, dùng chung
  // ProductVariant/ProductStockItem như PRODUCT) + quy trình sử dụng.
  // productType mặc định "PRODUCT" nếu client không gửi (form cũ/chưa cập nhật UI).
  const productTypeRaw = String(form.get("productType") ?? "PRODUCT").trim().toUpperCase();
  if (!["PRODUCT", "SERVICE", "TUT_TRICK", "TOOL"].includes(productTypeRaw)) {
    return NextResponse.json({ error: "Loại sản phẩm không hợp lệ." }, { status: 400 });
  }
  const productType = productTypeRaw as "PRODUCT" | "SERVICE" | "TUT_TRICK" | "TOOL";

  let serviceDeliveryMethods: string[] = [];
  let credentialViewWindowHours: number | null = null;
  const serviceFieldsData: {
    fieldKey: string;
    label: string;
    inputType: string;
    required: boolean;
    sortOrder: number;
  }[] = [];

  if (productType === "SERVICE") {
    let deliveryParsed: unknown;
    try {
      deliveryParsed = JSON.parse(String(form.get("serviceDeliveryMethods") ?? ""));
    } catch {
      deliveryParsed = null;
    }
    if (Array.isArray(deliveryParsed)) {
      serviceDeliveryMethods = deliveryParsed.filter(
        (m): m is string =>
          typeof m === "string" && (SERVICE_DELIVERY_METHODS as readonly string[]).includes(m)
      );
    }
    if (serviceDeliveryMethods.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 phương thức bàn giao hợp lệ." },
        { status: 400 }
      );
    }

    const windowRaw = form.get("credentialViewWindowHours");
    if (windowRaw !== null && String(windowRaw).trim() !== "") {
      const windowNum = Number(windowRaw);
      if (
        !Number.isInteger(windowNum) ||
        windowNum < SERVICE_CREDENTIAL_MIN_WINDOW_HOURS ||
        windowNum > SERVICE_CREDENTIAL_MAX_WINDOW_HOURS
      ) {
        return NextResponse.json(
          {
            error: `Cửa sổ xem thông tin phải từ ${SERVICE_CREDENTIAL_MIN_WINDOW_HOURS} đến ${SERVICE_CREDENTIAL_MAX_WINDOW_HOURS} giờ (để trống dùng mặc định).`,
          },
          { status: 400 }
        );
      }
      credentialViewWindowHours = windowNum;
    }

    let fieldsParsed: unknown;
    try {
      fieldsParsed = JSON.parse(String(form.get("serviceFields") ?? ""));
    } catch {
      fieldsParsed = null;
    }
    if (!Array.isArray(fieldsParsed) || fieldsParsed.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng khai ít nhất 1 trường buyer cần nhập cho dịch vụ." },
        { status: 400 }
      );
    }
    // PRODUCT_LISTING_AUDIT.md #7 — trước đây không giới hạn số field.
    if (fieldsParsed.length > SERVICE_FIELDS_MAX_COUNT) {
      return NextResponse.json(
        { error: `Chỉ được khai tối đa ${SERVICE_FIELDS_MAX_COUNT} trường thông tin cho 1 dịch vụ.` },
        { status: 400 }
      );
    }
    const usedKeys = new Set<string>();
    for (const raw of fieldsParsed as Record<string, unknown>[]) {
      const label = typeof raw?.label === "string" ? raw.label.trim() : "";
      const inputType = typeof raw?.inputType === "string" ? raw.inputType : "";
      if (label.length < 2 || label.length > 100) {
        return NextResponse.json(
          { error: `Nhãn trường "${label || "(trống)"}" phải từ 2-100 ký tự.` },
          { status: 400 }
        );
      }
      if (!(SERVICE_FIELD_INPUT_TYPES as readonly string[]).includes(inputType)) {
        return NextResponse.json(
          { error: `Loại trường không hợp lệ cho "${label}".` },
          { status: 400 }
        );
      }
      const fieldKey = slugifyFieldKey(label, usedKeys);
      usedKeys.add(fieldKey);
      serviceFieldsData.push({
        fieldKey,
        label,
        inputType,
        // Mặc định bắt buộc trừ khi client gửi tường minh required:false.
        required: raw?.required !== false,
        sortOrder: serviceFieldsData.length,
      });
    }
  }

  // TUT_TRICK: nội dung hướng dẫn ĐẦY ĐỦ — riêng tư, chỉ mở cho buyer đã mua
  // (đọc trực tiếp lúc checkout, KHÔNG BAO GIỜ trả qua GET nào public — xem
  // ghi chú Product.tutTrickContent trong schema.prisma).
  let tutTrickContent: string | null = null;
  if (productType === "TUT_TRICK") {
    const raw = String(form.get("tutTrickContent") ?? "").trim();
    if (raw.length < 20 || raw.length > 20000) {
      return NextResponse.json(
        { error: "Nội dung hướng dẫn phải từ 20-20.000 ký tự." },
        { status: 400 }
      );
    }
    tutTrickContent = raw;
  }

  // TOOL: quy trình sử dụng ĐẦY ĐỦ — riêng tư, cùng nguyên tắc tutTrickContent
  // ở trên (credential mã hoá RIÊNG, xem POST /api/seller/products/[id]/stock).
  let toolUsageGuide: string | null = null;
  if (productType === "TOOL") {
    const raw = String(form.get("toolUsageGuide") ?? "").trim();
    if (raw.length < 20 || raw.length > 20000) {
      return NextResponse.json(
        { error: "Quy trình sử dụng phải từ 20-20.000 ký tự." },
        { status: 400 }
      );
    }
    toolUsageGuide = raw;
  }

  // TOOL: giao thêm bằng LINK TẢI bên cạnh "Kho tài khoản tool" (ProductStockItem)
  // — tài nguyên DÙNG CHUNG (không tiêu hao), đọc LIVE từ Product lúc
  // reveal-delivered — không đụng gì tới checkout/tiền/tồn kho. Hình thức
  // "upload file .zip lên sàn" đã bị GỠ (quyết định bảo mật: không lưu file
  // thực thi trên máy chủ) — xem toolFileUrl/toolFileName/toolFileSize
  // deprecated trong schema.prisma.
  let toolDeliveryLink: string | null = null;
  if (productType === "TOOL") {
    const linkRaw = String(form.get("toolDeliveryLink") ?? "").trim();
    if (linkRaw) {
      if (linkRaw.length > 2000 || !/^https?:\/\/.+/i.test(linkRaw)) {
        return NextResponse.json(
          { error: "Link tải tool không hợp lệ — phải bắt đầu bằng http:// hoặc https://." },
          { status: 400 }
        );
      }
      toolDeliveryLink = linkRaw;
    }
  }

  // Giao thủ công (VPS/Server) — CHỈ có ý nghĩa cho productType="PRODUCT"
  // (tài khoản/dữ liệu; dịch vụ/TUT-Trick/Tool có cơ chế giao riêng của
  // chúng). Client không gửi/gửi rác → mặc định "AUTO_STOCK", giữ nguyên
  // hành vi cũ.
  const deliveryMethodRaw = String(form.get("deliveryMethod") ?? "AUTO_STOCK").trim().toUpperCase();
  if (!(DELIVERY_METHODS as readonly string[]).includes(deliveryMethodRaw)) {
    return NextResponse.json({ error: "Phương thức giao hàng không hợp lệ." }, { status: 400 });
  }
  const deliveryMethod =
    productType === "PRODUCT" ? (deliveryMethodRaw as "AUTO_STOCK" | "MANUAL_PROVISION") : "AUTO_STOCK";

  // "Tài khoản AI" — cờ seller bật khi chọn ô riêng ở form đăng (KHÔNG phải
  // productType mới, xem Product.requiresExpiryStock trong schema.prisma).
  // Chỉ có ý nghĩa cho Sản phẩm giao tự động từ kho — mutually exclusive với
  // VPS/Dịch vụ/TUT-Trick/TOOL, y hệt cách "Máy chủ (VPS)" tách UI trước đó.
  const requiresExpiryStock =
    productType === "PRODUCT" &&
    deliveryMethod === "AUTO_STOCK" &&
    String(form.get("requiresExpiryStock") ?? "") === "true";

  let serverDetailData: {
    kind: string;
    cpuCores: number | null;
    ramGb: number | null;
    storageGb: number | null;
    storageType: string | null;
    bandwidth: string | null;
    osOptions: string | null;
    location: string | null;
    billingCycle: string;
    uptimeSla: string | null;
    provisionSlaHours: number;
  } | null = null;

  if (deliveryMethod === "MANUAL_PROVISION") {
    const kindRaw = String(form.get("serverKind") ?? "VPS").trim().toUpperCase();
    if (!(SERVER_KINDS as readonly string[]).includes(kindRaw)) {
      return NextResponse.json({ error: "Loại máy chủ không hợp lệ." }, { status: 400 });
    }
    const billingRaw = String(form.get("billingCycle") ?? "ONE_TIME").trim().toUpperCase();
    if (!(SERVER_BILLING_CYCLES as readonly string[]).includes(billingRaw)) {
      return NextResponse.json({ error: "Chu kỳ thanh toán không hợp lệ." }, { status: 400 });
    }
    const slaRaw = form.get("provisionSlaHours");
    const slaNum = Number(slaRaw);
    if (!Number.isInteger(slaNum) || slaNum < MIN_PROVISION_SLA_HOURS) {
      return NextResponse.json(
        { error: `Thời hạn cấp phát phải là số nguyên >= ${MIN_PROVISION_SLA_HOURS} giờ.` },
        { status: 400 }
      );
    }

    const intOrNull = (key: string): number | null => {
      const raw = form.get(key);
      if (raw === null || String(raw).trim() === "") return null;
      const num = Number(raw);
      return Number.isInteger(num) && num >= 0 ? num : null;
    };
    const strOrNull = (key: string, max: number): string | null => {
      const raw = String(form.get(key) ?? "").trim();
      return raw ? raw.slice(0, max) : null;
    };

    let osOptionsParsed: unknown;
    try {
      osOptionsParsed = JSON.parse(String(form.get("osOptions") ?? "[]"));
    } catch {
      osOptionsParsed = [];
    }
    const osOptions = Array.isArray(osOptionsParsed)
      ? osOptionsParsed.filter((o): o is string => typeof o === "string" && o.trim() !== "").slice(0, 20)
      : [];

    serverDetailData = {
      kind: kindRaw,
      cpuCores: intOrNull("cpuCores"),
      ramGb: intOrNull("ramGb"),
      storageGb: intOrNull("storageGb"),
      storageType: strOrNull("storageType", 100),
      bandwidth: strOrNull("bandwidth", 100),
      osOptions: osOptions.length > 0 ? JSON.stringify(osOptions) : null,
      location: strOrNull("location", 100),
      billingCycle: billingRaw,
      uptimeSla: strOrNull("uptimeSla", 100),
      provisionSlaHours: slaNum,
    };
  }

  // Thời gian bảo hành (áp dụng cho CẢ 4 loại hàng) — checkbox "Không bảo
  // hành" gửi noWarranty=true → value=0 tường minh, không phụ thuộc client
  // gửi đúng warrantyValue=0 hay không. PRODUCT (tài khoản/dữ liệu kho thật)
  // bị ép tối thiểu MIN_WARRANTY_HOURS_PRODUCT — không cho "bán đứt".
  const noWarranty = form.get("noWarranty") === "true";
  let warrantyValue: number;
  let warrantyUnit: WarrantyUnit;
  if (noWarranty) {
    warrantyValue = 0;
    warrantyUnit = "day";
  } else {
    const unitRaw = String(form.get("warrantyUnit") ?? "day").trim().toLowerCase();
    if (unitRaw !== "hour" && unitRaw !== "day") {
      return NextResponse.json({ error: "Đơn vị bảo hành không hợp lệ." }, { status: 400 });
    }
    warrantyUnit = unitRaw;
    const num = Number(form.get("warrantyValue"));
    if (!Number.isInteger(num) || num < 0) {
      return NextResponse.json(
        { error: "Thời gian bảo hành phải là số nguyên >= 0." },
        { status: 400 }
      );
    }
    warrantyValue = num;
  }
  const warrantyHoursCheck = toWarrantyHours(warrantyValue, warrantyUnit);
  if (productType === "PRODUCT" && warrantyHoursCheck < MIN_WARRANTY_HOURS_PRODUCT) {
    return NextResponse.json(
      {
        error: `Sản phẩm (tài khoản/dữ liệu) phải bảo hành tối thiểu ${MIN_WARRANTY_HOURS_PRODUCT} giờ — không áp dụng "Không bảo hành" cho loại hàng này.`,
      },
      { status: 400 }
    );
  }

  // Chỉ cho gán vào danh mục APPROVED hoặc PENDING (đang chờ duyệt) — chặn hẳn
  // category REJECTED (hoặc không tồn tại) để sản phẩm không treo ở danh mục đã
  // bị từ chối/ẩn. Nhất quán với getSellerVisibleCategories() dùng cho dropdown.
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.status === "REJECTED") {
    return NextResponse.json({ error: "Danh mục không hợp lệ." }, { status: 400 });
  }

  let imageUrl: string;
  try {
    imageUrl = await saveProductImage(image);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Mô tả chi tiết nhập dạng textarea nhiều dòng — mỗi dòng không rỗng thành
  // 1 đoạn văn, khớp đúng shape `description: string[]` đã dùng xuyên suốt
  // dự án (xem product.description.map ở trang chi tiết sản phẩm).
  const description = descriptionRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let slug = slugifyProduct(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // PRODUCT_LISTING_AUDIT.md #5 — bọc try/catch quanh transaction: mọi lỗi
  // ghi DB không lường trước (race trùng slug hiếm gặp, ràng buộc DB khác...)
  // trả 400 gọn gàng thay vì để lộ 500/stack trace ra response.
  let product: { id: string; slug: string };
  try {
    product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          slug,
          name,
          shortDescription,
          description: JSON.stringify(description),
          attributes: JSON.stringify([]),
          price,
          stock,
          imageUrl,
          status: "PENDING",
          categoryId,
          sellerId: seller!.id,
          productType,
          serviceDeliveryMethods:
            productType === "SERVICE" ? JSON.stringify(serviceDeliveryMethods) : null,
          credentialViewWindowHours: productType === "SERVICE" ? credentialViewWindowHours : null,
          tutTrickContent,
          toolUsageGuide,
          toolDeliveryLink,
          warrantyValue,
          warrantyUnit,
          deliveryMethod,
          requiresExpiryStock,
        },
      });
      if (productType === "SERVICE") {
        await tx.serviceFieldDefinition.createMany({
          data: serviceFieldsData.map((f) => ({ ...f, productId: p.id })),
        });
      }
      if (serverDetailData) {
        await tx.serverDetail.create({ data: { ...serverDetailData, productId: p.id } });
      }
      return p;
    });
  } catch (err) {
    console.error("Tạo sản phẩm thất bại:", err);
    return NextResponse.json(
      { error: "Không thể đăng sản phẩm lúc này, vui lòng thử lại." },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: product.id, slug: product.slug });
}
