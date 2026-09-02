import {
  BadgeCheck,
  CalendarDays,
  Heart,
  LogIn,
  MessageCircle,
  MessageCircleReply,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import Pagination from "@/components/Pagination";
import RatingStars from "@/components/RatingStars";
import SellerActivityBadge from "@/components/SellerActivityBadge";
import SellerAvatar from "@/components/SellerAvatar";
import SellerLevelBadge from "@/components/SellerLevelBadge";
import Reveal from "@/components/Reveal";
import ReviewForm from "@/components/ReviewForm";
import ShopProductList, { type ShopSortKey } from "@/components/ShopProductList";
import { getAuthSession } from "@/lib/authz";
import { getSellerBySlug, getSellerProductsPaged, getSellerReviewsPaged } from "@/lib/queries";
import { absoluteUrl, truncate } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PRODUCTS_PAGE_SIZE = 24;
const REVIEWS_PAGE_SIZE = 10;

function parseShopSortKey(raw: string | undefined): ShopSortKey {
  return raw === "newest" || raw === "bestselling" ? raw : "popular";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seller: string }>;
}): Promise<Metadata> {
  const { seller: sellerSlug } = await params;
  const shop = await getSellerBySlug(sellerSlug);
  if (!shop || shop.suspended) return {};

  const title = `${shop.shopName} — Gian hàng trên MaketMMO`;
  const description = truncate(
    shop.description || `Gian hàng ${shop.shopName} với ${shop.productCount} sản phẩm đang bán trên MaketMMO.`
  );
  const url = absoluteUrl(`/shop/${shop.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: shop.avatarUrl ? [{ url: shop.avatarUrl }] : undefined,
    },
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ seller: string }>;
  searchParams: Promise<{ page?: string; sort?: string; reviewPage?: string }>;
}) {
  const { seller: sellerSlug } = await params;
  const { page, sort, reviewPage } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const currentReviewPage = Math.max(1, parseInt(reviewPage ?? "1", 10) || 1);
  const sortBy = parseShopSortKey(sort);

  const [shop, session] = await Promise.all([getSellerBySlug(sellerSlug), getAuthSession()]);
  if (!shop) notFound();

  const isOwnShop = session?.user?.id === shop.userId;
  // Gian hàng bị admin khoá (Admin > Người bán) biến mất khỏi site công khai
  // — trừ chính seller đó vẫn xem được gian hàng của mình để biết lý do.
  if (shop.suspended && !isOwnShop) notFound();

  // TRƯỚC ĐÂY getSellerBySlug() include TOÀN BỘ products/reviews của seller
  // (không take/skip) — 1 gian hàng nhiều sản phẩm/đánh giá sẽ tải hết về dù
  // trang chỉ hiển thị 1 trang (xem PERFORMANCE_AUDIT.md mục 1). Giờ tách
  // riêng 2 query phân trang thật, chạy song song (đều cần shop.id nên phải
  // đợi getSellerBySlug() xong trước, không gộp chung Promise.all ở trên
  // được) — số liệu tổng (productCount/totalSold/avgRating/reviewCount) vẫn
  // lấy từ `shop` (đã tính qua aggregate, đúng TOÀN gian hàng bất kể đang ở
  // trang nào).
  const [productsResult, reviewsResult] = await Promise.all([
    getSellerProductsPaged(shop.id, { sort: sortBy, page: currentPage, pageSize: PRODUCTS_PAGE_SIZE }),
    getSellerReviewsPaged(shop.id, { page: currentReviewPage, pageSize: REVIEWS_PAGE_SIZE }),
  ]);

  const seller = shop.shopName;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Ảnh bìa + card hồ sơ dùng CHUNG 1 khung bao (max-w-7xl + padding
            ngang) để 2 khối luôn CÙNG bề rộng/CÙNG lề trái-phải — TRƯỚC ĐÂY
            ảnh bìa nằm NGOÀI khung này (full-bleed hết viewport) trong khi
            card hồ sơ bên dưới bị bó trong max-w-7xl, khiến ảnh bìa rộng hơn
            và tràn ra 2 bên mép card, nhìn lệch. Bo góc trên của ảnh bìa
            (rounded-t-2xl) khớp đúng góc bo của card (rounded-2xl) để 2 khối
            liền thành 1 mảng thị giác duy nhất. */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Ảnh bìa gian hàng (Seller.coverUrl, Trang Bán Hàng > Hồ sơ cá nhân)
              — giữ nguyên gradient cũ làm fallback khi seller chưa upload. */}
          <div className="relative h-32 overflow-hidden rounded-t-2xl bg-gradient-to-r from-ink to-ink-soft sm:h-40">
            {shop.coverUrl && (
              <Image
                src={shop.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 1472px) 1472px, 100vw"
                priority
              />
            )}
          </div>

          <Reveal>
            <div className="-mt-14 flex flex-col gap-4 rounded-2xl border border-border-c bg-surface p-6 shadow-sm sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <SellerAvatar avatarUrl={shop.avatarUrl} shopName={seller} size={80} shape="square" fallback="store" ring />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-success text-white ring-2 ring-surface">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black text-foreground">{seller}</h1>
                  <SellerLevelBadge
                    level={shop.levelBadge.level}
                    name={shop.levelBadge.name}
                    tone={shop.levelBadge.tone}
                  />
                  <SellerActivityBadge lastActiveAt={shop.lastActiveAt} />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <RatingStars rating={shop.avgRating} />
                  <span className="text-xs font-bold text-foreground">
                    {shop.reviewCount > 0 ? shop.avgRating.toFixed(1) : "Chưa có"}
                  </span>
                  <span className="text-xs text-muted">
                    ({shop.reviewCount} đánh giá)
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-sm text-muted">
                  {shop.description}
                </p>
                {shop.specialty && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-light/40 px-2.5 py-1 text-xs font-semibold text-ink">
                    🎯 Chuyên: {shop.specialty}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Tham gia:{" "}
                    {shop.createdAt.toLocaleDateString("vi-VN")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircleReply className="h-3.5 w-3.5" /> Phản hồi: 101%
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5" /> Đã bán:{" "}
                    {shop.totalSold.toLocaleString("vi-VN")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> Yêu thích: 12
                  </span>
                </div>
              </div>

              {!session?.user ? (
                <Link
                  href={`/dang-nhap?callbackUrl=/shop/${shop.slug}`}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
                >
                  <LogIn className="h-4 w-4" /> Đăng nhập để chat
                </Link>
              ) : !isOwnShop ? (
                <Link
                  href={`/tin-nhan?with=${shop.userId}`}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
                >
                  <MessageCircle className="h-4 w-4" /> Nhắn tin
                </Link>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div
              id="san-pham-gian-hang"
              className="mt-6 flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-brand shadow-sm"
            >
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-black text-ink">
                <Store className="h-4 w-4" /> Sản phẩm của {seller}
              </div>
              <span className="mr-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">
                {shop.productCount} sản phẩm
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <ShopProductList products={productsResult.items} sellerSlug={shop.slug} sortBy={sortBy} />
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-4">
              <Pagination
                basePath={`/shop/${shop.slug}`}
                currentPage={currentPage}
                totalCount={productsResult.total}
                pageSize={PRODUCTS_PAGE_SIZE}
                sectionId="san-pham-gian-hang"
                sort={sortBy === "popular" ? undefined : sortBy}
                extraParams={currentReviewPage > 1 ? { reviewPage: String(currentReviewPage) } : undefined}
              />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mt-10 pb-12">
            <div
              id="danh-gia-gian-hang"
              className="mb-4 flex items-center gap-2 overflow-hidden rounded-xl bg-ink px-4 py-3 text-sm font-black text-white"
            >
              <Star className="h-4 w-4 text-brand" /> Đánh giá từ người mua
              <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">
                {shop.reviewCount}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-3">
                {reviewsResult.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
                    Gian hàng này chưa có đánh giá nào.
                  </div>
                ) : (
                  <>
                    {reviewsResult.items.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-border-c bg-surface p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar size={28} />
                          <span className="text-sm font-bold text-foreground">
                            {review.authorName}
                          </span>
                          <RatingStars rating={review.rating} />
                          <span className="ml-auto text-xs text-muted">
                            {review.createdAt.toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-foreground/80">{review.comment}</p>
                      </div>
                    ))}
                    <Pagination
                      basePath={`/shop/${shop.slug}`}
                      currentPage={currentReviewPage}
                      totalCount={reviewsResult.total}
                      pageSize={REVIEWS_PAGE_SIZE}
                      sectionId="danh-gia-gian-hang"
                      pageParam="reviewPage"
                      extraParams={{
                        ...(currentPage > 1 ? { page: String(currentPage) } : {}),
                        ...(sortBy !== "popular" ? { sort: sortBy } : {}),
                      }}
                    />
                  </>
                )}
              </div>

              <ReviewForm sellerId={shop.id} />
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
