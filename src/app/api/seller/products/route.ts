import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { getMySellerProducts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { slugifyProduct } from "@/lib/slug";
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

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
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

  const product = await prisma.product.create({
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
    },
  });

  return NextResponse.json({ id: product.id, slug: product.slug });
}
