import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import {
  SERVICE_CREDENTIAL_MAX_WINDOW_HOURS,
  SERVICE_CREDENTIAL_MIN_WINDOW_HOURS,
  SERVICE_DELIVERY_METHODS,
  SERVICE_FIELD_INPUT_TYPES,
} from "@/lib/constants";
import { getMySellerProducts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { slugifyFieldKey, slugifyProduct } from "@/lib/slug";
import { saveProductImage } from "@/lib/uploads";

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
  const { seller, error } = await requireSeller();
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

  if (name.length < 5 || name.length > 150) {
    return NextResponse.json(
      { error: "Tên sản phẩm phải từ 5-150 ký tự." },
      { status: 400 }
    );
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Vui lòng chọn danh mục." }, { status: 400 });
  }
  if (shortDescription.length < 10 || shortDescription.length > 200) {
    return NextResponse.json(
      { error: "Mô tả ngắn phải từ 10-200 ký tự." },
      { status: 400 }
    );
  }
  if (descriptionRaw.length < 20) {
    return NextResponse.json(
      { error: "Mô tả chi tiết phải có ít nhất 20 ký tự." },
      { status: 400 }
    );
  }
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 1000) {
    return NextResponse.json(
      { error: "Giá phải là số, tối thiểu 1.000đ." },
      { status: 400 }
    );
  }
  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Kho phải là số nguyên >= 0." }, { status: 400 });
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh sản phẩm." }, { status: 400 });
  }

  // Dịch vụ: buyer phải cung cấp thông tin (tài khoản/link/mật khẩu...) cho
  // seller thực hiện — xem model ServiceFieldDefinition. TUT_TRICK: bán nội
  // dung hướng dẫn/kiến thức, bán lặp lại vô hạn — xem Product.tutTrickContent.
  // productType mặc định "PRODUCT" nếu client không gửi (form cũ/chưa cập nhật UI).
  const productTypeRaw = String(form.get("productType") ?? "PRODUCT").trim().toUpperCase();
  if (!["PRODUCT", "SERVICE", "TUT_TRICK"].includes(productTypeRaw)) {
    return NextResponse.json({ error: "Loại sản phẩm không hợp lệ." }, { status: 400 });
  }
  const productType = productTypeRaw as "PRODUCT" | "SERVICE" | "TUT_TRICK";

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

  const product = await prisma.$transaction(async (tx) => {
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
      },
    });
    if (productType === "SERVICE") {
      await tx.serviceFieldDefinition.createMany({
        data: serviceFieldsData.map((f) => ({ ...f, productId: p.id })),
      });
    }
    return p;
  });

  return NextResponse.json({ id: product.id, slug: product.slug });
}
