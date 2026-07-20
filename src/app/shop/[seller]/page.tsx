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
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import ProductCard from "@/components/ProductCard";
import RatingStars from "@/components/RatingStars";
import Reveal from "@/components/Reveal";
import ReviewForm from "@/components/ReviewForm";
import { getAuthSession } from "@/lib/authz";
import { getSellerBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

const sortOptions = ["Phổ Biến", "Mới Nhất", "Bán Chạy"];

export default async function ShopPage({
  params,
}: {
  params: Promise<{ seller: string }>;
}) {
  const { seller: sellerSlug } = await params;
  const [shop, session] = await Promise.all([getSellerBySlug(sellerSlug), getAuthSession()]);
  if (!shop) notFound();

  const isOwnShop = session?.user?.id === shop.userId;
  // Gian hàng bị admin khoá (Admin > Người bán) biến mất khỏi site công khai
  // — trừ chính seller đó vẫn xem được gian hàng của mình để biết lý do.
  if (shop.suspended && !isOwnShop) notFound();

  const seller = shop.shopName;
  const items = shop.products;
  const sellerLevel = shop.level;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="h-32 bg-gradient-to-r from-ink to-ink-soft sm:h-40" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="-mt-14 flex flex-col gap-4 rounded-2xl border border-border-c bg-surface p-6 shadow-sm sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand text-3xl shadow ring-4 ring-surface">
                  <Store className="h-9 w-9 text-ink" />
                </span>
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-success text-white ring-2 ring-surface">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black text-ink">{seller}</h1>
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-brand">
                    Level {sellerLevel}
                  </span>
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-ink">
                    ONLINE
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <RatingStars rating={shop.avgRating} />
                  <span className="text-xs font-bold text-ink">
                    {shop.reviewCount > 0 ? shop.avgRating.toFixed(1) : "Chưa có"}
                  </span>
                  <span className="text-xs text-muted">
                    ({shop.reviewCount} đánh giá)
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-sm text-muted">
                  {shop.description}
                </p>
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
                    {items.reduce((sum, p) => sum + p.sold, 0).toLocaleString("vi-VN")}
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
            <div className="mt-6 flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-brand shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-black text-ink">
                <Store className="h-4 w-4" /> Sản phẩm của {seller}
              </div>
              <span className="mr-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">
                {items.length} sản phẩm
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="my-4 flex flex-wrap gap-2">
              {sortOptions.map((option, i) => (
                <button
                  key={option}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    i === 0
                      ? "bg-ink text-white"
                      : "bg-surface text-ink ring-1 ring-border-c hover:bg-surface-alt"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
                Gian hàng chưa có sản phẩm.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </Reveal>

          <Reveal delay={0.1} className="mt-10 pb-12">
            <div className="mb-4 flex items-center gap-2 overflow-hidden rounded-xl bg-ink px-4 py-3 text-sm font-black text-white">
              <Star className="h-4 w-4 text-brand" /> Đánh giá từ người mua
              <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">
                {shop.reviewCount}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-3">
                {shop.reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
                    Gian hàng này chưa có đánh giá nào.
                  </div>
                ) : (
                  shop.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-border-c bg-surface p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar size={28} />
                        <span className="text-sm font-bold text-ink">
                          {review.authorName}
                        </span>
                        <RatingStars rating={review.rating} />
                        <span className="ml-auto text-xs text-muted">
                          {review.createdAt.toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/80">{review.comment}</p>
                    </div>
                  ))
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
