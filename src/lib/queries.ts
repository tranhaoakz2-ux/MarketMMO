import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/data/products";
import {
  SERVICE_CATEGORY_SLUGS,
  type DisputeStatus,
  type OrderStatus,
  type WalletTxType,
} from "@/lib/constants";

const productInclude = {
  category: true,
  seller: { include: { user: true } },
  variants: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

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
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    sold: p.sold,
    views: p.views,
    seller: p.seller.shopName,
    sellerLevel: p.seller.level,
    verified: p.verified,
    hot: p.hot,
    preOrder: p.preOrder,
    featuredViaAuction: Boolean(p.featuredUntil && p.featuredUntil > new Date()),
    sellerLastActiveAt: p.seller.user.lastActiveAt?.toISOString() ?? null,
    sellerInsuranceBalance: p.seller.insuranceBalance,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      stock: v.stock,
      sold: v.sold,
    })),
  };
}

export async function getAllCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapProduct);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: {
      OR: [{ hot: true }, { featuredUntil: { gt: new Date() } }],
    },
    include: productInclude,
    // Auction winners (non-null featuredUntil) must outrank plain "hot"
    // sponsored items — without `nulls: "last"`, Postgres sorts NULL first
    // on DESC, which silently hid auction winners behind `take` once there
    // were more hot products than the limit.
    orderBy: [{ featuredUntil: { sort: "desc", nulls: "last" } }, { sold: "desc" }],
    take: limit,
  });
  return rows.map(mapProduct);
}

export async function getProductsByCategory(
  categorySlug: string
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: { slug: categorySlug } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapProduct);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.product.findMany({
    where: {
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
  return rows.map(mapProduct);
}

export async function getProductBySlugDb(
  slug: string
): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  return row ? mapProduct(row) : null;
}

export async function getRelatedProductsDb(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: {
      category: { slug: product.categorySlug },
      id: { not: product.id },
    },
    include: productInclude,
    take: limit,
  });
  return rows.map(mapProduct);
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
      products: { include: productInclude, orderBy: { createdAt: "desc" } },
      reviews: {
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!seller) return null;

  return {
    id: seller.id,
    userId: seller.userId,
    shopName: seller.shopName,
    slug: seller.slug,
    description: seller.description,
    level: seller.level,
    verified: seller.verified,
    createdAt: seller.createdAt,
    products: seller.products.map(mapProduct),
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
  return rows.map(mapProduct);
}

export async function getAllSellersWithStats() {
  const sellers = await prisma.seller.findMany({
    include: {
      products: { select: { id: true } },
      reviews: { select: { rating: true } },
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
  const rows = await prisma.orderItem.findMany({
    where: {
      sellerId,
      product: {
        category: {
          slug: service ? { in: SERVICE_CATEGORY_SLUGS } : { notIn: SERVICE_CATEGORY_SLUGS },
        },
      },
    },
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

export async function getSellerReviews(sellerId: string) {
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
