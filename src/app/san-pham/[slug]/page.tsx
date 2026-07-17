import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Heart,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumb from "@/components/Breadcrumb";
import BuyBox from "@/components/BuyBox";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductInfoTabs from "@/components/ProductInfoTabs";
import ProductThumbnail from "@/components/ProductThumbnail";
import RatingStars from "@/components/RatingStars";
import Reveal from "@/components/Reveal";
import { formatLastActive, formatVnd } from "@/lib/format";
import { getRecentForumPosts } from "@/lib/forum";
import { getProductBySlugDb, getRelatedProductsDb, getSellerReviews } from "@/lib/queries";
import { slugifySeller } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlugDb(slug);
  if (!product) notFound();

  const related = await getRelatedProductsDb(product);
  const referencePosts = await getRecentForumPosts(4);
  const sellerReviews = product.sellerId ? await getSellerReviews(product.sellerId) : [];

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "/" },
              { label: product.categoryLabel, href: `/danh-muc/${product.categorySlug}` },
              { label: product.name },
            ]}
          />
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
          <Reveal direction="right">
            <div className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm">
              <div className="relative">
                <span className="absolute left-0 top-0 z-10 rounded-md border border-brand bg-ink px-2.5 py-1 text-[11px] font-bold text-brand">
                  KHO MARKETMMO
                </span>
                <button
                  className="absolute right-0 top-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white shadow"
                  aria-label="Thêm vào yêu thích"
                >
                  <Heart className="h-4 w-4 text-danger" />
                </button>
                <ProductThumbnail
                  imageUrl={product.imageUrl}
                  categorySlug={product.categorySlug}
                  boxClassName="h-[294px] w-full rounded-xl border-2 border-brand bg-surface-alt"
                  iconClassName="h-[92px] w-[92px] text-ink/70"
                  sizes="380px"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1.5 rounded-lg border border-border-c py-2 text-xs font-semibold text-ink hover:bg-surface-alt">
                  <Heart className="h-3.5 w-3.5" /> Thêm sản phẩm Yêu thích
                </button>
                <Link
                  href={`/shop/${slugifySeller(product.seller)}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border-c py-2 text-xs font-semibold text-ink hover:bg-surface-alt"
                >
                  <Store className="h-3.5 w-3.5" /> Xem Shop
                </Link>
              </div>

              <div className="mt-3 flex gap-2 rounded-lg border-l-4 border-brand-dark bg-brand-light/25 p-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
                <p className="text-[11px] leading-relaxed text-ink/80">
                  <strong className="text-ink">Lưu ý:</strong> Khách hàng nên
                  xem kỹ <strong className="text-ink">chế độ bảo hành</strong>{" "}
                  hoặc <strong className="text-ink">nhắn tin cho người bán</strong>{" "}
                  trước khi mua để đảm bảo quyền lợi.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand bg-surface p-4 shadow-sm sm:p-5">
              <div>
                <h1 className="text-xl font-black leading-snug text-brand-dark sm:text-[26px]">
                  {product.name}
                </h1>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-danger sm:text-4xl">
                    {product.priceMax
                      ? `${formatVnd(product.price)} - ${formatVnd(product.priceMax)}`
                      : formatVnd(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted line-through">
                      {formatVnd(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 divide-x divide-border-c border-y border-border-c py-2.5 text-sm text-muted">
                <span className="flex items-center gap-1 pl-0">
                  <RatingStars rating={product.rating} />({product.reviewCount}{" "}
                  đánh giá)
                </span>
                <span className="flex items-center gap-1 pl-3">
                  <PackageCheck className="h-4 w-4 text-sky-600" /> Kho:{" "}
                  {product.stock}
                  <RefreshCw className="h-3.5 w-3.5 text-muted/70" />
                </span>
                <span className="flex items-center gap-1 pl-3">
                  <TrendingUp className="h-4 w-4 text-orange-500" /> Đã bán:{" "}
                  {product.sold}
                </span>
                <span className="flex items-center gap-1 pl-3 font-semibold text-success">
                  <ShieldAlert className="h-4 w-4" /> Khiếu nại: 0.0%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Avatar size={28} />
                <Link
                  href={`/shop/${slugifySeller(product.seller)}`}
                  className="font-bold text-success hover:underline"
                >
                  Người bán: {product.seller}
                </Link>
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-brand">
                  LV {product.sellerLevel}
                </span>
                {product.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                    <BadgeCheck className="h-3.5 w-3.5 text-success" /> Đã xác thực
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm font-semibold text-muted">
                  <Clock className="h-4 w-4 text-brand-dark" />
                  {formatLastActive(product.sellerLastActiveAt)}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-xs font-bold text-info">
                  <ShieldCheck className="h-3.5 w-3.5 text-info" /> Bảo hiểm:{" "}
                  {formatVnd(product.sellerInsuranceBalance ?? 0)}
                </span>
              </div>

              {(!product.variants || product.variants.length === 0) && (
                <div className="rounded-lg bg-brand-light/50 px-3 py-2.5 text-sm font-semibold text-ink">
                  {product.shortDescription}
                </div>
              )}

              <BuyBox product={product} />
            </div>
          </Reveal>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <Reveal>
            <ProductInfoTabs
              description={product.description}
              rating={product.rating}
              reviewCount={product.reviewCount}
              sellerShopHref={`/shop/${slugifySeller(product.seller)}`}
              sellerId={product.sellerId ?? null}
              sellerReviews={sellerReviews}
            />
          </Reveal>

          {related.length > 0 && (
            <Reveal delay={0.05} className="mt-8">
              <div className="rounded-lg bg-ink px-4 py-3 text-sm font-black text-white">
                SẢN PHẨM TƯƠNG TỰ
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1} className="mt-8">
            <div className="rounded-lg bg-gradient-to-r from-success to-emerald-400 px-4 py-3 text-sm font-black text-white">
              BÀI VIẾT THAM KHẢO
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {referencePosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dien-dan/${post.id}`}
                  className="rounded-xl border border-border-c bg-surface p-3 shadow-sm transition hover:border-brand"
                >
                  <p className="line-clamp-2 text-sm font-bold text-ink">
                    {post.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Avatar size={20} />
                    {post.authorName}
                    <span className="ml-auto flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {post.commentCount}
                    </span>
                  </div>
                </Link>
              ))}
              {referencePosts.length === 0 && (
                <p className="col-span-full text-sm text-muted">Chưa có bài viết nào.</p>
              )}
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
