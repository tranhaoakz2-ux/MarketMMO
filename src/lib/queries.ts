import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/data/products";
import {
  SERVICE_CATEGORY_SLUGS,
  type DisputePhase,
  type DisputeStatus,
  type OrderStatus,
  type WalletTxType,
} from "@/lib/constants";
import { computeEffectivePrice, type MegaSaleFields } from "@/lib/mega-sale";

const productInclude = {
  category: true,
  seller: { include: { user: true } },
  variants: { orderBy: { sortOrder: "asc" } },
  serviceFields: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

// Mega Sale áp dụng lên GIÁ NIÊM YẾT — dùng CHUNG DUY NHẤT với checkout
// (src/lib/mega-sale.ts) để không đẻ 2 nguồn giá. Kiểu FIXED chỉ có ý nghĩa
// cho sản phẩm giá đơn (không priceMax, không variant) — validate lúc seller
// cấu hình; ở đây chỉ áp FIXED cho `price` gốc, KHÔNG áp cho priceMax/variant
// (đồng bộ đúng quy tắc đã chốt).
function computeMegaSale(p: ProductWithRelations) {
  const saleFields: MegaSaleFields = {
    megaSaleActive: p.megaSaleActive,
    megaSaleType: p.megaSaleType,
    megaSalePercent: p.megaSalePercent,
    megaSaleFixedPrice: p.megaSaleFixedPrice,
    megaSaleEndsAt: p.megaSaleEndsAt,
  };
  const base = computeEffectivePrice(p.price, saleFields);
  if (!base.isSaleActive) return null;
  const maxSale = p.priceMax != null ? computeEffectivePrice(p.priceMax, saleFields) : null;
  return {
    active: true,
    percentOff: base.percentOff ?? 0,
    endsAt: p.megaSaleEndsAt?.toISOString() ?? null,
    salePrice: base.price,
    salePriceMax: maxSale?.price,
  };
}

// Giá variant sau Mega Sale — CHỈ kiểu PERCENT áp cho variant (kiểu FIXED
// gắn với đúng 1 mức giá, không có nghĩa khi 1 sản phẩm có nhiều variant giá
// khác nhau — cùng quy tắc đã áp dụng ở checkout, xem POST /api/checkout).
function computeVariantSalePrice(p: ProductWithRelations, variantPrice: number): number | undefined {
  if (!p.megaSaleActive || p.megaSaleType !== "PERCENT") return undefined;
  const result = computeEffectivePrice(variantPrice, {
    megaSaleActive: p.megaSaleActive,
    megaSaleType: p.megaSaleType,
    megaSalePercent: p.megaSalePercent,
    megaSaleFixedPrice: p.megaSaleFixedPrice,
    megaSaleEndsAt: p.megaSaleEndsAt,
  });
  return result.isSaleActive ? result.price : undefined;
}

function mapProduct(p: ProductWithRelations): Product {
  return {
    id: p.id,
    slug: p.slug,
    categorySlug: p.category.slug,
    categoryLabel: p.category.name.toUpperCase(),
    name: p.name,
    shortDescription: p.shortDescription,
    description: JSON.parse(p.description) as string[],
    attributes: JSON.parse(p.attributes) as string[],
    price: p.price,
    priceMax: p.priceMax ?? undefined,
    originalPrice: p.originalPrice ?? undefined,
    megaSale: computeMegaSale(p),
    // Mặc định "chưa có đánh giá" — attachRealRatings() ghi đè bằng dữ liệu
    // thật từ bảng Review ngay sau mapProduct() ở MỌI hàm export bên dưới.
    // Cố tình KHÔNG đọc p.rating/p.reviewCount (số tĩnh từ seed) nữa — nếu
    // 1 hàm nào đó lỡ quên gọi attachRealRatings(), sản phẩm sẽ hiện "chưa
    // có đánh giá" (an toàn) thay vì số giả (sai).
    rating: null,
    reviewCount: 0,
    stock: p.stock,
    sold: p.sold,
    views: p.views,
    seller: p.seller.shopName,
    sellerLevel: p.seller.level,
    sellerAvatarUrl: p.seller.avatarUrl,
    verified: p.verified,
    hot: p.hot,
    preOrder: p.preOrder,
    featuredViaAuction: Boolean(p.featuredUntil && p.featuredUntil > new Date()),
    sellerLastActiveAt: p.seller.user.lastActiveAt?.toISOString() ?? null,
    sellerInsuranceBalance: p.seller.insuranceBalance,
    sellerId: p.sellerId,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    status: p.status as "PENDING" | "APPROVED" | "REJECTED",
    adminNote: p.adminNote,
    isActive: p.isActive,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      stock: v.stock,
      sold: v.sold,
      salePrice: computeVariantSalePrice(p, v.price),
    })),
    productType: p.productType as "PRODUCT" | "SERVICE",
    serviceDeliveryMethods: p.serviceDeliveryMethods
      ? (JSON.parse(p.serviceDeliveryMethods) as string[])
      : undefined,
    credentialViewWindowHours: p.credentialViewWindowHours ?? undefined,
    serviceFields: p.serviceFields.map((f) => ({
      id: f.id,
      fieldKey: f.fieldKey,
      label: f.label,
      inputType: f.inputType as "text" | "url" | "textarea" | "secret",
      required: f.required,
    })),
  };
}

// Ghi đè rating/reviewCount (mặc định null/0 từ mapProduct()) bằng số liệu
// THẬT tính từ bảng Review theo Review.productId — 1 query groupBy duy nhất
// cho cả danh sách, không phải N+1. Review.hidden=true (admin đã ẩn) không
// tính vào, cùng nguyên tắc ratingStats() dùng cho rating gian hàng. Review
// KHÔNG gắn sản phẩm nào (productId=null, review "chung gian hàng" cũ) tự
// động bị loại vì không khớp productId nào trong danh sách truyền vào.
// Gọi ở CUỐI mọi hàm export trả về Product/Product[] — xem mapProduct().
async function attachRealRatings<T extends { id: string; rating: number | null; reviewCount: number }>(
  products: T[]
): Promise<T[]> {
  if (products.length === 0) return products;
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) }, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const statsByProductId = new Map(grouped.filter((g) => g.productId).map((g) => [g.productId as string, g]));
  for (const p of products) {
    const stats = statsByProductId.get(p.id);
    p.rating = stats ? Math.round((stats._avg.rating ?? 0) * 10) / 10 : null;
    p.reviewCount = stats?._count.rating ?? 0;
  }
  return products;
}

// Dùng cho mọi nơi hiển thị công khai (trang chủ, trang danh mục, mega-menu)
// — chỉ trả danh mục đã được admin duyệt. Danh mục do seller tự đề xuất
// (status PENDING/REJECTED) không được lộ ra ngoài cho tới khi admin duyệt.
// CHỈ trả category LÁ (children: none) — nhóm cha trong cây danh mục
// (xem getCategoryTree() bên dưới) không bao giờ lọt vào tabs/dropdown chọn
// category vì sản phẩm chỉ được gán vào category lá, không gán vào nhóm cha.
export async function getAllCategories() {
  return prisma.category.findMany({
    where: { status: "APPROVED", isActive: true, children: { none: {} } },
    orderBy: { name: "asc" },
  });
}

// Dùng riêng cho dropdown chọn danh mục trong form đăng sản phẩm của seller
// (AddProductForm) — seller cần thấy CẢ danh mục đang chờ duyệt (kể cả do
// chính họ hoặc seller khác vừa đề xuất) để có thể gán sản phẩm mới vào đó
// ngay, không cần đợi admin duyệt xong category mới đăng được sản phẩm. Loại
// trừ REJECTED vì danh mục đó coi như không tồn tại. Cùng lý do trên: chỉ
// category lá (danh mục seller-đề-xuất mới tạo luôn là lá, không có con).
export async function getSellerVisibleCategories() {
  return prisma.category.findMany({
    where: { status: { in: ["APPROVED", "PENDING"] }, isActive: true, children: { none: {} } },
    orderBy: { name: "asc" },
  });
}

export type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  sortOrder: number;
  children: CategoryTreeNode[];
};

// Cây danh mục ĐẦY ĐỦ (nhóm cha + lá) cho sidebar "Bộ lọc" ở trang danh mục
// — xem CategorySidebar.tsx. Chỉ 1 query phẳng rồi dựng cây trong bộ nhớ
// (số category hiện tại rất nhỏ, không cần recursive CTE). Nếu category cha
// của 1 dòng bị ẩn/chưa duyệt (không có trong `rows`), dòng đó tự rơi về làm
// gốc thay vì biến mất hẳn khỏi sidebar — tránh mồ côi dữ liệu trong mắt
// người dùng.
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const rows = await prisma.category.findMany({
    where: { status: "APPROVED", isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, emoji: true, sortOrder: true, parentId: true },
  });

  const byId = new Map<string, CategoryTreeNode>();
  for (const r of rows) {
    byId.set(r.id, { id: r.id, slug: r.slug, name: r.name, emoji: r.emoji, sortOrder: r.sortOrder, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Lấy 1 category BẤT KỲ theo slug (nhóm cha lẫn lá) — dùng cho trang danh
// mục (`/danh-muc/[slug]`) để hiển thị tiêu đề/breadcrumb, KHÁC
// getAllCategories() (chỉ trả lá, dùng cho tabs/dropdown). Trang danh mục
// phải nhận diện được cả slug nhóm cha vì bấm vào nhóm cha trong sidebar
// cũng điều hướng tới đúng route này (gộp sản phẩm mọi category con — xem
// getProductsByCategory()).
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, status: "APPROVED", isActive: true },
    include: { parent: { select: { slug: true, name: true } } },
  });
}

// Thu thập id của 1 category + TOÀN BỘ category con cháu (đệ quy, không giới
// hạn độ sâu) — dùng để gộp sản phẩm khi bấm vào 1 nhóm cha. Lặp theo từng
// tầng (BFS) thay vì raw SQL recursive CTE vì cây hiện rất nông (2-3 tầng),
// đơn giản hơn và đủ nhanh cho tần suất truy cập của 1 trang danh mục.
// Export để dùng lại ở API admin quản lý cây category (chặn gán parentId
// tạo vòng lặp — xem src/app/api/admin/category-tree/[id]/route.ts).
export async function collectDescendantCategoryIds(rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    if (children.length === 0) break;
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { status: "APPROVED", isActive: true, seller: { suspended: false } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return attachRealRatings(rows.map(mapProduct));
}

// "Sản phẩm nổi bật" trang chủ — 3 tầng, KHÔNG BAO GIỜ để trống dưới `limit`
// (nếu đủ sản phẩm hợp lệ tồn tại trên sàn):
//   1) Admin tự ghim (Product.isFeatured, sắp theo featuredOrder) — ĐỨNG
//      TRƯỚC, không giới hạn số lượng ghim, nhưng carousel chỉ hiện `limit`
//      đầu tiên.
//   2) Nếu chưa đủ `limit`: điền tiếp bằng ĐÚNG cơ chế cũ (hot=true HOẶC
//      đang thắng đấu giá vị trí vàng featuredUntil>now) — giữ nguyên
//      nguyên vẹn tính năng đấu giá đang chạy thật, không hồi quy.
//   3) Nếu vẫn chưa đủ: điền nốt bằng bán chạy nhất trong số còn lại.
// Mọi tầng đều lọc status=APPROVED + isActive=true + seller không bị khoá —
// sản phẩm ẩn/xoá không bao giờ lọt vào dù đã được ghim trước đó, và tự
// hiện lại đúng vị trí cũ khi được bật lại (không cần thao tác gì thêm vì
// isFeatured/featuredOrder không đổi khi ẩn/hiện).
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const baseWhere = { status: "APPROVED" as const, isActive: true, seller: { suspended: false } };

  const pinned = await prisma.product.findMany({
    where: { ...baseWhere, isFeatured: true },
    include: productInclude,
    orderBy: [{ featuredOrder: { sort: "asc", nulls: "last" } }],
  });

  const pinnedIds = pinned.map((p) => p.id);
  let remaining = limit - pinned.length;

  let tier2: typeof pinned = [];
  if (remaining > 0) {
    tier2 = await prisma.product.findMany({
      where: {
        ...baseWhere,
        id: { notIn: pinnedIds },
        OR: [{ hot: true }, { featuredUntil: { gt: new Date() } }],
      },
      include: productInclude,
      orderBy: [{ featuredUntil: { sort: "desc", nulls: "last" } }, { sold: "desc" }],
      take: remaining,
    });
    remaining -= tier2.length;
  }

  let tier3: typeof pinned = [];
  if (remaining > 0) {
    const excludeIds = [...pinnedIds, ...tier2.map((p) => p.id)];
    tier3 = await prisma.product.findMany({
      where: { ...baseWhere, id: { notIn: excludeIds } },
      include: productInclude,
      orderBy: [{ sold: "desc" }],
      take: remaining,
    });
  }

  return attachRealRatings([...pinned, ...tier2, ...tier3].map(mapProduct));
}

// Khi categorySlug là 1 nhóm cha (có category con), gộp sản phẩm của MỌI
// category con cháu (đệ quy) — khi là category lá, hành vi y hệt trước đây
// (chỉ sản phẩm gán trực tiếp vào đúng category đó).
export async function getProductsByCategory(
  categorySlug: string
): Promise<Product[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });
  if (!category) return [];
  const categoryIds = await collectDescendantCategoryIds(category.id);

  const rows = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      seller: { suspended: false },
      categoryId: { in: categoryIds },
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return attachRealRatings(rows.map(mapProduct));
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      seller: { suspended: false },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { seller: { shopName: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return attachRealRatings(rows.map(mapProduct));
}

// Tỷ lệ khiếu nại THẬT của 1 sản phẩm = số OrderItem có Dispute (bất kỳ
// trạng thái nào — OPEN/RESOLVED_*, kể cả khiếu nại admin xử thắng cho
// seller vẫn tính là "đã có khiếu nại xảy ra", đúng nghĩa tỷ lệ khiếu nại
// chứ không phải tỷ lệ buyer thắng) / tổng số OrderItem của sản phẩm đó.
// null khi sản phẩm CHƯA có đơn hàng nào (mẫu số = 0) — UI phải hiện "Chưa
// có dữ liệu" thay vì "0.0%" (0.0% dễ hiểu nhầm là đã bán nhiều mà không ai
// khiếu nại, trong khi thực tế là chưa bán được gì).
async function getProductDisputeStats(
  productId: string
): Promise<{ ratePercent: number; totalOrders: number } | null> {
  const totalOrders = await prisma.orderItem.count({ where: { productId } });
  if (totalOrders === 0) return null;
  const disputedOrders = await prisma.orderItem.count({
    where: { productId, dispute: { isNot: null } },
  });
  return { ratePercent: Math.round((disputedOrders / totalOrders) * 1000) / 10, totalOrders };
}

// Trang chi tiết sản phẩm CÔNG KHAI — chỉ trả sản phẩm đã duyệt (status
// APPROVED), sản phẩm đang chờ duyệt/bị từ chối trả về null (404) dù đúng
// slug, tránh khách hàng xem/mua được sản phẩm chưa qua kiểm duyệt. Seller
// xem sản phẩm CỦA MÌNH (mọi trạng thái) qua getMySellerProducts() ở trang
// quản lý riêng, không qua hàm này.
export async function getProductBySlugDb(
  slug: string
): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { slug, status: "APPROVED", isActive: true, seller: { suspended: false } },
    include: productInclude,
  });
  if (!row) return null;
  const product = mapProduct(row);
  await attachRealRatings([product]);
  product.disputeStats = await getProductDisputeStats(product.id);

  // Tín hiệu "có thời hạn" cho BuyBox — 1 query nhỏ RIÊNG chỉ trong hàm này
  // (không đụng `productInclude` dùng chung cho mọi trang listing, tránh
  // làm chậm trang chủ/danh mục), cùng tinh thần với getMySellerProducts()
  // tự query thêm groupBy riêng cho số liệu kho. `distinct: ["variantId"]`
  // nên chỉ trả tối đa 1 dòng/variant (+ 1 dòng cho variantId=null), không
  // tốn kém dù sản phẩm có nhiều bản ghi kho.
  const timedRows = await prisma.productStockItem.findMany({
    where: { productId: product.id, status: "AVAILABLE", expiresAt: { gt: new Date() } },
    select: { variantId: true },
    distinct: ["variantId"],
  });
  const timedVariantIds = new Set(timedRows.map((r) => r.variantId));
  product.hasTimedStock = timedVariantIds.has(null);
  for (const variant of product.variants ?? []) {
    variant.hasTimedStock = timedVariantIds.has(variant.id);
  }

  return product;
}

export async function getRelatedProductsDb(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      seller: { suspended: false },
      category: { slug: product.categorySlug },
      id: { not: product.id },
    },
    include: productInclude,
    take: limit,
  });
  return attachRealRatings(rows.map(mapProduct));
}

function ratingStats(reviews: { rating: number }[]) {
  const reviewCount = reviews.length;
  const avgRating = reviewCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  return { avgRating, reviewCount };
}

export async function getSellerBySlug(slug: string) {
  const seller = await prisma.seller.findUnique({
    where: { slug },
    include: {
      // status: "APPROVED" — sản phẩm PENDING/REJECTED của seller (từ tính
      // năng "Đăng sản phẩm mới") không được lộ ra trang gian hàng công khai,
      // cùng quy tắc đã áp dụng cho mọi query công khai khác trong file này.
      // isActive: true — sản phẩm admin đã ẩn cũng biến mất khỏi shop công khai.
      products: {
        where: { status: "APPROVED", isActive: true },
        include: productInclude,
        orderBy: { createdAt: "desc" },
      },
      // hidden: false — review admin đã ẩn (spam/xúc phạm) biến mất khỏi
      // trang shop công khai VÀ khỏi rating trung bình tính ở ratingStats().
      reviews: {
        where: { hidden: false },
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!seller) return null;

  const products = await attachRealRatings(seller.products.map(mapProduct));

  return {
    id: seller.id,
    userId: seller.userId,
    shopName: seller.shopName,
    slug: seller.slug,
    description: seller.description,
    specialty: seller.specialty,
    level: seller.level,
    verified: seller.verified,
    suspended: seller.suspended,
    avatarUrl: seller.avatarUrl,
    createdAt: seller.createdAt,
    products,
    reviews: seller.reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      authorName: r.user.name ?? r.user.username ?? "Người dùng",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    ...ratingStats(seller.reviews),
  };
}

export async function getAuctionSlots() {
  const slots = await prisma.auctionSlot.findMany({
    where: { status: "OPEN" },
    orderBy: { position: "asc" },
    include: {
      _count: { select: { bids: true } },
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          seller: { select: { shopName: true, slug: true } },
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return slots.map((slot) => {
    const top = slot.bids[0];
    return {
      id: slot.id,
      position: slot.position,
      period: slot.period as "DAILY" | "WEEKLY",
      floorPrice: slot.floorPrice,
      startAt: slot.startAt,
      endAt: slot.endAt,
      bidCount: slot._count.bids,
      topBid: top
        ? {
            amount: top.amount,
            sellerName: top.seller.shopName,
            sellerSlug: top.seller.slug,
            productName: top.product.name,
            productSlug: top.product.slug,
          }
        : null,
    };
  });
}

export async function getMySellerProducts(userId: string): Promise<Product[]> {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) return [];
  const rows = await prisma.product.findMany({
    where: { sellerId: seller.id },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  const products = await attachRealRatings(rows.map(mapProduct));
  if (products.length === 0) return products;

  // Cấu hình Mega Sale THÔ (chưa qua tính hiệu lực/hết hạn) — chỉ trang quản
  // lý của seller cần, để điền lại đúng form chỉnh sửa kể cả khi sale đã hết
  // hạn hẹn giờ. `rows`/`products` CÙNG THỨ TỰ (map trực tiếp, không sort lại).
  for (let i = 0; i < products.length; i++) {
    const raw = rows[i];
    products[i].megaSaleConfig = {
      active: raw.megaSaleActive,
      type: raw.megaSaleType as "PERCENT" | "FIXED" | null,
      percent: raw.megaSalePercent,
      fixedPrice: raw.megaSaleFixedPrice,
      endsAt: raw.megaSaleEndsAt?.toISOString() ?? null,
    };
  }

  // Gắn số liệu kho dữ liệu giao hàng thật (ProductStockItem) — chỉ tính
  // riêng cho trang quản lý sản phẩm của seller, KHÔNG đụng tới mapProduct()
  // dùng chung cho mọi trang public (tránh tốn thêm 1 query group-by trên
  // mỗi lượt xem trang chi tiết sản phẩm công khai).
  const productIds = products.map((p) => p.id);
  const counts = await prisma.productStockItem.groupBy({
    by: ["productId", "variantId", "status"],
    where: { productId: { in: productIds } },
    _count: { _all: true },
  });

  const availableMap = new Map<string, number>();
  const totalMap = new Map<string, number>();
  for (const row of counts) {
    const key = `${row.productId}|${row.variantId ?? ""}`;
    totalMap.set(key, (totalMap.get(key) ?? 0) + row._count._all);
    if (row.status === "AVAILABLE") {
      availableMap.set(key, (availableMap.get(key) ?? 0) + row._count._all);
    }
  }

  for (const product of products) {
    const baseKey = `${product.id}|`;
    product.stockManaged = totalMap.has(baseKey);
    product.stockAvailable = availableMap.get(baseKey) ?? 0;
    for (const variant of product.variants ?? []) {
      const variantKey = `${product.id}|${variant.id}`;
      variant.stockManaged = totalMap.has(variantKey);
      variant.stockAvailable = availableMap.get(variantKey) ?? 0;
    }
  }

  return products;
}

export async function getAllSellersWithStats() {
  const sellers = await prisma.seller.findMany({
    where: { suspended: false },
    include: {
      products: { select: { id: true } },
      reviews: { where: { hidden: false }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sellers.map((s) => ({
    id: s.id,
    shopName: s.shopName,
    slug: s.slug,
    description: s.description,
    level: s.level,
    verified: s.verified,
    avatarUrl: s.avatarUrl,
    createdAt: s.createdAt,
    productCount: s.products.length,
    ...ratingStats(s.reviews),
  }));
}

// "Các Seller Nổi Bật" trang chủ — KHÁC getAllSellersWithStats() ở trên
// (dùng cho /nguoi-ban, hiện TOÀN BỘ seller, KHÔNG đụng tới): tầng 1 admin
// tự ghim (Seller.isFeatured, sắp featuredOrder) đứng trước, chưa đủ `limit`
// thì điền tiếp seller có đánh giá trung bình cao nhất, rồi tới nhiều sản
// phẩm nhất, rồi tới mới nhất — không có cờ kiểu "hot" cho seller nên dùng
// bộ tiêu chí này làm proxy hợp lý cho "đáng giới thiệu". Rating tính động
// (không phải cột DB) nên sắp bằng JS sau khi lấy hết seller còn lại, chấp
// nhận được vì số seller trên sàn còn nhỏ (không phân trang).
export async function getFeaturedSellers(limit = 8) {
  const baseWhere = { suspended: false as const };
  const includeShape = {
    products: { select: { id: true } },
    reviews: { where: { hidden: false }, select: { rating: true } },
  };

  const pinnedRows = await prisma.seller.findMany({
    where: { ...baseWhere, isFeatured: true },
    include: includeShape,
    orderBy: [{ featuredOrder: { sort: "asc" as const, nulls: "last" as const } }],
  });

  const pinnedIds = pinnedRows.map((s) => s.id);
  const remaining = limit - pinnedRows.length;

  let autoFillRows: typeof pinnedRows = [];
  if (remaining > 0) {
    const candidates = await prisma.seller.findMany({
      where: { ...baseWhere, id: { notIn: pinnedIds } },
      include: includeShape,
    });
    autoFillRows = candidates
      .map((s) => ({ row: s, stats: ratingStats(s.reviews) }))
      .sort((a, b) => {
        if (b.stats.avgRating !== a.stats.avgRating) return b.stats.avgRating - a.stats.avgRating;
        if (b.row.products.length !== a.row.products.length) return b.row.products.length - a.row.products.length;
        return b.row.createdAt.getTime() - a.row.createdAt.getTime();
      })
      .slice(0, remaining)
      .map((x) => x.row);
  }

  return [...pinnedRows, ...autoFillRows].map((s) => ({
    id: s.id,
    shopName: s.shopName,
    slug: s.slug,
    description: s.description,
    level: s.level,
    verified: s.verified,
    avatarUrl: s.avatarUrl,
    createdAt: s.createdAt,
    productCount: s.products.length,
    ...ratingStats(s.reviews),
  }));
}

// ---- Quản Lý Bán Hàng (seller dashboard) ----

export async function getSellerRevenueStats(sellerId: string, from: Date, to: Date) {
  const items = await prisma.orderItem.findMany({
    where: { sellerId, createdAt: { gte: from, lte: to } },
    select: { status: true, price: true, quantity: true },
  });

  let releasedRevenue = 0;
  let escrowHeld = 0;
  for (const item of items) {
    const amount = item.price * item.quantity;
    if (item.status === "RELEASED") releasedRevenue += amount;
    else if (item.status === "ESCROW") escrowHeld += amount;
  }

  return { releasedRevenue, escrowHeld, orderCount: items.length };
}

export async function getSellerWalletSummary(userId: string, sellerId: string) {
  const [user, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
    prisma.seller.findUnique({ where: { id: sellerId }, select: { insuranceBalance: true } }),
  ]);
  return {
    walletBalance: user?.walletBalance ?? 0,
    insuranceBalance: seller?.insuranceBalance ?? 0,
  };
}

export async function getSellerOrderItems(sellerId: string, { service }: { service: boolean }) {
  // Ưu tiên productType (field DB thật) — SERVICE_CATEGORY_SLUGS chỉ còn là
  // fallback lịch sử, đã backfill đủ productType cho toàn bộ sản phẩm cũ
  // thuộc 3 category đó (xem prisma/pending-sql/2026-07-28-service-orders.sql)
  // nên trong thực tế 2 điều kiện hiện cho kết quả giống hệt nhau — giữ OR
  // với heuristic cũ chỉ để phòng trường hợp hiếm: sản phẩm tạo NGOÀI luồng
  // POST /api/seller/products (vd chèn tay qua Prisma Studio) thiếu productType.
  const rows = await prisma.orderItem.findMany({
    where: {
      sellerId,
      product: service
        ? {
            OR: [
              { productType: "SERVICE" },
              { category: { slug: { in: SERVICE_CATEGORY_SLUGS } } },
            ],
          }
        : {
            productType: "PRODUCT",
            category: { slug: { notIn: SERVICE_CATEGORY_SLUGS } },
          },
    },
    include: {
      product: { include: { category: true } },
      order: { include: { buyer: { select: { name: true, username: true, email: true } } } },
      serviceIntake: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productName: item.productName,
    variantLabel: item.variantLabel,
    categoryName: item.product.category.name,
    buyerName:
      item.order.buyer.name ?? item.order.buyer.username ?? item.order.buyer.email ?? "Người mua",
    quantity: item.quantity,
    price: item.price,
    status: item.status as OrderStatus,
    escrowReleaseAt: item.escrowReleaseAt,
    createdAt: item.createdAt,
    serviceIntake: item.serviceIntake
      ? {
          deliveryMethod: item.serviceIntake.deliveryMethod,
          publicFields: item.serviceIntake.publicFields
            ? (JSON.parse(item.serviceIntake.publicFields) as Record<string, string>)
            : {},
          hasSecretFields: Boolean(item.serviceIntake.encryptedFields),
          sellerAcceptedAt: item.serviceIntake.sellerAcceptedAt,
          sensitiveRevealDeadline: item.serviceIntake.sensitiveRevealDeadline,
          sensitivePurgedAt: item.serviceIntake.sensitivePurgedAt,
        }
      : null,
  }));
}

// Công khai — dùng cho tab "Đánh giá" ở trang chi tiết sản phẩm/gian hàng
// (ProductInfoTabs qua san-pham/[slug]/page.tsx). Review admin đã ẩn KHÔNG
// hiện ở đây, cùng cách ForumPost bị ẩn biến mất khỏi diễn đàn công khai.
// Dùng cho tab "ĐÁNH GIÁ" ở trang chi tiết sản phẩm — CHỈ review gắn đúng
// productId này (Review.productId), khớp với rating/reviewCount thật hiện ở
// đầu tab (attachRealRatings()) thay vì mượn tạm mọi review của cả gian
// hàng như trước đây.
export async function getProductReviews(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, hidden: false },
    include: { user: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((r) => ({
    id: r.id,
    authorName: r.user.name ?? r.user.username ?? "Người dùng",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
  }));
}

// Dùng riêng cho trang quản lý CỦA CHÍNH seller (/trang-ban-hang/danh-gia)
// — seller thấy ĐỦ mọi review kể cả bị admin ẩn (kèm cờ hidden để UI hiện
// badge), cùng quy ước "seller luôn thấy đủ dữ liệu của mình" đã áp dụng
// cho getMySellerProducts(). Thống kê điểm trung bình vẫn nên tính riêng
// theo review KHÔNG ẩn ở tầng component để khớp với số buyer nhìn thấy.
export async function getMySellerReviews(sellerId: string) {
  const reviews = await prisma.review.findMany({
    where: { sellerId },
    include: { user: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((r) => ({
    id: r.id,
    authorName: r.user.name ?? r.user.username ?? "Người dùng",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    hidden: r.hidden,
  }));
}

export async function getSellerPreOrderItems(sellerId: string) {
  const rows = await prisma.orderItem.findMany({
    where: { sellerId, product: { preOrder: true }, status: "ESCROW" },
    include: {
      product: { include: { category: true } },
      order: { include: { buyer: { select: { name: true, username: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productName: item.productName,
    variantLabel: item.variantLabel,
    categoryName: item.product.category.name,
    buyerName:
      item.order.buyer.name ?? item.order.buyer.username ?? item.order.buyer.email ?? "Người mua",
    quantity: item.quantity,
    price: item.price,
    status: item.status as OrderStatus,
    escrowReleaseAt: item.escrowReleaseAt,
    createdAt: item.createdAt,
  }));
}

export async function getSellerDisputes(sellerId: string) {
  const disputes = await prisma.dispute.findMany({
    where: { orderItem: { sellerId } },
    orderBy: { createdAt: "desc" },
    include: {
      openedBy: { select: { name: true, username: true, email: true } },
      orderItem: true,
    },
  });

  return disputes.map((d) => ({
    id: d.id,
    reason: d.reason,
    status: d.status as DisputeStatus,
    phase: d.phase as DisputePhase,
    warrantyDeadline: d.warrantyDeadline,
    warrantyRejectedAt: d.warrantyRejectedAt,
    refundAmount: d.refundAmount,
    createdAt: d.createdAt,
    resolvedAt: d.resolvedAt,
    openedByName: d.openedBy.name ?? d.openedBy.username ?? d.openedBy.email ?? "Người dùng",
    productName: d.orderItem.productName,
    amount: d.orderItem.price * d.orderItem.quantity,
  }));
}

export async function getSellerWalletHistory(userId: string, type: WalletTxType) {
  return prisma.walletTransaction.findMany({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  });
}

// ---- Tổng quan mở rộng (biểu đồ, phân bổ trạng thái, sản phẩm bán chạy,
// đơn hàng gần đây, cần xử lý, snapshot gian hàng) ----

// Doanh số theo thời gian cho biểu đồ cột — cố tình tính trên MỌI trạng thái
// trừ CANCELLED (không chỉ RELEASED như card "Doanh thu"), vì nếu chỉ tính
// RELEASED thì 3 ngày gần nhất luôn gần như bằng 0 (đang trong thời gian ký
// quỹ ESCROW_HOLD_DAYS) — nhìn như biểu đồ bị lỗi dù seller vẫn bán đều.
// Gộp theo tuần thay vì theo ngày khi khoảng ngày dài (>10 ngày) để biểu đồ
// không quá nhiều cột. Điền đủ mọi mốc trong khoảng (kể cả 0 đơn) để các cột
// cách đều nhau, không bị hụt do thiếu dữ liệu ngày đó.
// Gộp danh sách OrderItem (price/quantity/createdAt) thành các cột theo
// ngày (hoặc theo tuần nếu khoảng ngày > 10 ngày) — dùng chung cho biểu đồ
// doanh số của cả seller (getSellerRevenueTrend) lẫn toàn nền tảng
// (getPlatformRevenueTrend). Tự điền đủ mọi mốc trong khoảng (kể cả 0) để
// các cột cách đều nhau.
function bucketRevenue(
  items: { price: number; quantity: number; createdAt: Date }[],
  from: Date,
  to: Date
) {
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const bucketByWeek = spanDays > 10;
  const stepMs = bucketByWeek ? 7 * 86400000 : 86400000;

  const bucketStart = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (bucketByWeek) start.setDate(start.getDate() - start.getDay());
    return start.getTime();
  };

  const buckets = new Map<number, number>();
  const end = bucketStart(to);
  for (let cursor = bucketStart(from); cursor <= end; cursor += stepMs) {
    buckets.set(cursor, 0);
  }

  for (const item of items) {
    const key = bucketStart(item.createdAt);
    buckets.set(key, (buckets.get(key) ?? 0) + item.price * item.quantity);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, value]) => {
      const d = new Date(ts);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value };
    });
}

export async function getSellerRevenueTrend(sellerId: string, from: Date, to: Date) {
  const items = await prisma.orderItem.findMany({
    where: { sellerId, createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    select: { price: true, quantity: true, createdAt: true },
  });
  return bucketRevenue(items, from, to);
}

export async function getSellerOrderStatusBreakdown(
  sellerId: string,
  from: Date,
  to: Date
): Promise<Record<OrderStatus, number>> {
  const counts = await prisma.orderItem.groupBy({
    by: ["status"],
    where: { sellerId, createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const result: Record<OrderStatus, number> = { ESCROW: 0, RELEASED: 0, CANCELLED: 0, DISPUTED: 0 };
  for (const row of counts) {
    result[row.status as OrderStatus] = row._count._all;
  }
  return result;
}

// Sản phẩm bán chạy nhất trong khoảng ngày đã chọn — xếp theo doanh số (giá
// × số lượng), loại CANCELLED (không tính đơn đã huỷ là "bán chạy").
export async function getSellerTopProducts(
  sellerId: string,
  from: Date,
  to: Date,
  limit = 4
) {
  const items = await prisma.orderItem.findMany({
    where: { sellerId, createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    select: {
      productId: true,
      productName: true,
      price: true,
      quantity: true,
      product: { select: { slug: true, category: { select: { name: true } } } },
    },
  });

  const map = new Map<
    string,
    { productName: string; slug: string; categoryName: string; quantity: number; revenue: number }
  >();
  for (const item of items) {
    const amount = item.price * item.quantity;
    const existing = map.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += amount;
    } else {
      map.set(item.productId, {
        productName: item.productName,
        slug: item.product.slug,
        categoryName: item.product.category.name,
        quantity: item.quantity,
        revenue: amount,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

// Đơn hàng gần đây — độc lập với khoảng ngày đang lọc (luôn là N đơn mới
// nhất), giống 1 activity feed.
export async function getSellerRecentOrders(sellerId: string, limit = 5) {
  const rows = await prisma.orderItem.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      order: { include: { buyer: { select: { name: true, username: true, email: true } } } },
    },
  });
  return rows.map((item) => ({
    id: item.id,
    productName: item.productName,
    buyerName:
      item.order.buyer.name ?? item.order.buyer.username ?? item.order.buyer.email ?? "Người mua",
    amount: item.price * item.quantity,
    status: item.status as OrderStatus,
    createdAt: item.createdAt,
  }));
}

const LOW_STOCK_THRESHOLD = 3;

// Những việc cần seller chú ý ngay: sản phẩm đang chờ admin duyệt, khiếu nại
// đang mở, và các SKU đã dùng kho thật (ProductStockItem) nhưng số lượng
// AVAILABLE xuống thấp (< LOW_STOCK_THRESHOLD) — không tính SKU chưa từng
// dùng kho thật (stock chỉ là số seller tự gõ, không phải tín hiệu thật).
export async function getSellerAttentionCounts(sellerId: string) {
  const [pendingProducts, openDisputes, stockRows] = await Promise.all([
    prisma.product.count({ where: { sellerId, status: "PENDING" } }),
    // Việc seller cần xử: khiếu nại đang ở pha BẢO HÀNH (SELLER_WARRANTY) của
    // gian hàng mình — không tính khiếu nại đã escalate lên sàn (PLATFORM, admin
    // xử). SECURITY_AUDIT #8 Phần B.
    prisma.dispute.count({
      where: { status: "OPEN", phase: "SELLER_WARRANTY", orderItem: { sellerId } },
    }),
    prisma.productStockItem.groupBy({
      by: ["productId", "variantId", "status"],
      where: { product: { sellerId } },
      _count: { _all: true },
    }),
  ]);

  const availableMap = new Map<string, number>();
  const totalMap = new Map<string, number>();
  for (const row of stockRows) {
    const key = `${row.productId}|${row.variantId ?? ""}`;
    totalMap.set(key, (totalMap.get(key) ?? 0) + row._count._all);
    if (row.status === "AVAILABLE") {
      availableMap.set(key, (availableMap.get(key) ?? 0) + row._count._all);
    }
  }
  let lowStock = 0;
  for (const [key, total] of totalMap) {
    if (total === 0) continue;
    if ((availableMap.get(key) ?? 0) < LOW_STOCK_THRESHOLD) lowStock++;
  }

  return { pendingProducts, openDisputes, lowStock };
}

// Snapshot gian hàng cho card "Gian hàng của bạn" — rating tính động giống
// getAllSellersWithStats(), không lưu cache trên Seller.
export async function getSellerStoreSnapshot(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: { reviews: { where: { hidden: false }, select: { rating: true } } },
  });
  if (!seller) return null;
  return {
    shopName: seller.shopName,
    slug: seller.slug,
    level: seller.level,
    verified: seller.verified,
    avatarUrl: seller.avatarUrl,
    specialty: seller.specialty,
    insuranceBalance: seller.insuranceBalance,
    ...ratingStats(seller.reviews),
  };
}

// ---- Admin Control Center (/admin) ----

// Số đếm cho badge sidebar admin — 1 query gộp (Promise.all) chạy trong
// layout.tsx, dùng chung cho mọi trang con thay vì mỗi trang tự đếm lại.
export async function getAdminSidebarCounts() {
  const [
    pendingProducts,
    pendingCategories,
    pendingForumReports,
    pendingDeposits,
    pendingWithdrawals,
    openDisputes,
    eligibleCommissions,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "PENDING" } }),
    prisma.category.count({ where: { status: "PENDING" } }),
    prisma.forumReport.count({ where: { status: "OPEN" } }),
    prisma.walletTransaction.count({ where: { type: "DEPOSIT", status: "PENDING" } }),
    prisma.walletTransaction.count({ where: { type: "WITHDRAW", status: "PENDING" } }),
    // Admin chỉ đếm khiếu nại đã escalate lên sàn (PLATFORM) — Phần B.
    prisma.dispute.count({ where: { status: "OPEN", phase: "PLATFORM" } }),
    prisma.referralCommission.count({ where: { status: "ELIGIBLE" } }),
  ]);
  return {
    pendingProducts,
    pendingCategories,
    pendingForumReports,
    pendingDeposits,
    pendingWithdrawals,
    openDisputes,
    eligibleCommissions,
  };
}

// KPI trang Tổng quan admin: tổng giá trị giao dịch (GMV) trong khoảng ngày
// đã chọn, số user/seller mới trong khoảng đó, và số tiền đang ký quỹ (snapshot
// TOÀN hệ thống tại thời điểm gọi — không lọc theo khoảng ngày, vì đây là số
// dư hiện tại chứ không phải phát sinh trong kỳ).
export async function getAdminOverviewStats(from: Date, to: Date) {
  const [gmvItems, newUsers, newSellers, escrowItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      select: { price: true, quantity: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.seller.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.orderItem.findMany({
      where: { status: "ESCROW" },
      select: { price: true, quantity: true },
    }),
  ]);

  const gmv = gmvItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const escrowTotal = escrowItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { gmv, orderCount: gmvItems.length, newUsers, newSellers, escrowTotal };
}

// Biểu đồ GMV toàn nền tảng — dùng lại đúng logic gộp cột theo ngày/tuần của
// getSellerRevenueTrend (xem bucketRevenue) nhưng KHÔNG lọc theo sellerId.
export async function getPlatformRevenueTrend(from: Date, to: Date) {
  const items = await prisma.orderItem.findMany({
    where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    select: { price: true, quantity: true, createdAt: true },
  });
  return bucketRevenue(items, from, to);
}

export type AdminActivityItem = {
  id: string;
  type: "USER_JOINED" | "SELLER_JOINED" | "DISPUTE_OPENED" | "PRODUCT_PENDING" | "AUDIT";
  title: string;
  sub: string;
  createdAt: Date;
  href: string;
  detail?: string;
};

// Dòng thời gian "Hoạt động gần đây" trang Tổng quan admin — gộp 5 nguồn dữ
// liệu thật khác nhau (không có bảng "activity" riêng), sort theo createdAt
// rồi cắt lấy `limit` dòng mới nhất. Mỗi loại có href trỏ thẳng tới trang chi
// tiết tương ứng để admin bấm vào xem ngay.
export async function getAdminActivityFeed(limit = 15): Promise<AdminActivityItem[]> {
  const take = Math.min(limit, 10);
  const [users, sellers, disputes, pendingProducts, auditLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, email: true, username: true, createdAt: true },
    }),
    prisma.seller.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, shopName: true, slug: true, createdAt: true },
    }),
    prisma.dispute.findMany({
      // Feed hoạt động admin chỉ hiện khiếu nại đã lên sàn (PLATFORM) — Phần B.
      where: { status: "OPEN", phase: "PLATFORM" },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        orderItem: { select: { productName: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        createdAt: true,
        seller: { select: { shopName: true } },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        targetType: true,
        detail: true,
        createdAt: true,
        admin: { select: { email: true, username: true } },
      },
    }),
  ]);

  const items: AdminActivityItem[] = [
    ...users.map((u) => ({
      id: `user-${u.id}`,
      type: "USER_JOINED" as const,
      title: "Tài khoản mới đăng ký",
      sub: u.username ?? u.email ?? u.id,
      createdAt: u.createdAt,
      href: "/admin/nguoi-dung",
    })),
    ...sellers.map((s) => ({
      id: `seller-${s.id}`,
      type: "SELLER_JOINED" as const,
      title: "Gian hàng mới kích hoạt",
      sub: s.shopName,
      createdAt: s.createdAt,
      href: `/shop/${s.slug}`,
    })),
    ...disputes.map((d) => ({
      id: `dispute-${d.id}`,
      type: "DISPUTE_OPENED" as const,
      title: "Khiếu nại mới được mở",
      sub: d.orderItem.productName,
      createdAt: d.createdAt,
      href: `/admin/khieu-nai?open=${d.id}`,
      detail: d.reason,
    })),
    ...pendingProducts.map((p) => ({
      id: `product-${p.id}`,
      type: "PRODUCT_PENDING" as const,
      title: "Sản phẩm mới chờ duyệt",
      sub: `${p.name} · ${p.seller.shopName}`,
      createdAt: p.createdAt,
      href: "/admin/san-pham",
    })),
    ...auditLogs.map((a) => ({
      id: `audit-${a.id}`,
      type: "AUDIT" as const,
      title: a.action,
      sub: `${a.admin.username ?? a.admin.email ?? "admin"} · ${a.targetType}`,
      createdAt: a.createdAt,
      href: "/admin/nhat-ky",
      detail: a.detail ?? undefined,
    })),
  ];

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

const ORDERS_PAGE_SIZE = 30;

// Trang Admin > Đơn hàng & Ký quỹ — duyệt TOÀN BỘ OrderItem trên nền tảng
// (không giới hạn theo seller như trang seller dashboard), lọc theo status
// tuỳ chọn, phân trang đơn giản (page 1-based).
export async function getAdminOrderItems(status: OrderStatus | "ALL", page: number) {
  const where = status === "ALL" ? {} : { status };
  const [items, total] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      include: {
        order: { include: { buyer: { select: { name: true, username: true, email: true } } } },
        product: { include: { seller: { select: { shopName: true, slug: true } } } },
      },
    }),
    prisma.orderItem.count({ where }),
  ]);

  return {
    items: items.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      productName: i.productName,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
      price: i.price,
      status: i.status as OrderStatus,
      escrowReleaseAt: i.escrowReleaseAt,
      createdAt: i.createdAt,
      buyerName: i.order.buyer.name ?? i.order.buyer.username ?? i.order.buyer.email ?? "—",
      sellerName: i.product?.seller.shopName ?? "—",
      sellerSlug: i.product?.seller.slug ?? null,
    })),
    total,
    pageSize: ORDERS_PAGE_SIZE,
    page,
    totalPages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

const AUDIT_LOG_PAGE_SIZE = 40;

export async function getAdminAuditLogPage(page: number) {
  const [entries, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_LOG_PAGE_SIZE,
      take: AUDIT_LOG_PAGE_SIZE,
      include: { admin: { select: { email: true, username: true, name: true } } },
    }),
    prisma.adminAuditLog.count(),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      detail: e.detail,
      createdAt: e.createdAt,
      adminName: e.admin.name ?? e.admin.username ?? e.admin.email ?? "admin",
    })),
    total,
    pageSize: AUDIT_LOG_PAGE_SIZE,
    page,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_LOG_PAGE_SIZE)),
  };
}

// Trang Admin > Đấu giá vị trí vàng — TOÀN BỘ slot (không lọc status như
// getAuctionSlots() dùng cho trang /dau-gia công khai), kèm đủ lịch sử bid
// (không chỉ top 1) để admin xem toàn cảnh trước khi gán thủ công/huỷ.
export async function getAdminAuctionSlots() {
  const slots = await prisma.auctionSlot.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: {
      bids: {
        orderBy: { amount: "desc" },
        include: {
          seller: { select: { shopName: true, slug: true } },
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  // Chỉ giữ slot OPEN mới nhất + 1 vài slot CLOSED gần nhất mỗi vị trí, tránh
  // trả về toàn bộ lịch sử vô hạn khi hệ thống đã xoay vòng nhiều lần.
  const byPosition = new Map<number, typeof slots>();
  for (const s of slots) {
    const arr = byPosition.get(s.position) ?? [];
    if (arr.length < 3) arr.push(s);
    byPosition.set(s.position, arr);
  }

  return [...byPosition.values()]
    .flat()
    .sort((a, b) => a.position - b.position || b.createdAt.getTime() - a.createdAt.getTime())
    .map((slot) => ({
      id: slot.id,
      position: slot.position,
      period: slot.period as "DAILY" | "WEEKLY",
      floorPrice: slot.floorPrice,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: slot.status as "OPEN" | "CLOSED",
      bids: slot.bids.map((b) => ({
        id: b.id,
        amount: b.amount,
        createdAt: b.createdAt,
        sellerName: b.seller.shopName,
        sellerSlug: b.seller.slug,
        productName: b.product.name,
        productSlug: b.product.slug,
      })),
    }));
}

// Trang Admin > Sức khoẻ tài chính — tổng hợp số dư toàn hệ thống tại thời
// điểm hiện tại (snapshot, không lọc theo khoảng ngày như Tổng quan).
export async function getAdminFinancialHealth() {
  const [walletAgg, insuranceAgg, escrowItems, releasedAgg, referralAgg, depositAgg, withdrawAgg] =
    await Promise.all([
      prisma.user.aggregate({ _sum: { walletBalance: true } }),
      prisma.seller.aggregate({ _sum: { insuranceBalance: true } }),
      prisma.orderItem.findMany({ where: { status: "ESCROW" }, select: { price: true, quantity: true } }),
      prisma.orderItem.findMany({ where: { status: "RELEASED" }, select: { price: true, quantity: true } }),
      prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: "REFERRAL_BONUS", status: "CONFIRMED" },
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: "DEPOSIT", status: "CONFIRMED" },
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: "WITHDRAW", status: "CONFIRMED" },
      }),
    ]);

  const escrowTotal = escrowItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const releasedTotal = releasedAgg.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    totalWalletBalance: walletAgg._sum.walletBalance ?? 0,
    totalInsuranceBalance: insuranceAgg._sum.insuranceBalance ?? 0,
    escrowTotal,
    releasedTotal,
    totalReferralPaid: referralAgg._sum.amount ?? 0,
    totalDeposited: depositAgg._sum.amount ?? 0,
    totalWithdrawn: Math.abs(withdrawAgg._sum.amount ?? 0),
  };
}
