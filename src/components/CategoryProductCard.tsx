import { BadgeCheck, Crown, Star } from "lucide-react";
import Link from "next/link";
import ProductThumbnail from "@/components/ProductThumbnail";
import type { Product } from "@/data/products";
import { formatVnd } from "@/lib/format";

// Đồng bộ với phân loại "Dịch vụ" ở CategoryTabs.tsx/Header.tsx: schema chưa
// tách bảng dịch vụ khỏi sản phẩm, nên coi 3 category liên quan tới cày
// thuê/nâng cấp là "Dịch vụ", còn lại là "Sản phẩm".
const serviceCategorySlugs = new Set(["boosting", "chatgpt", "youtube"]);

export default function CategoryProductCard({ product }: { product: Product }) {
  const typeLabel = serviceCategorySlugs.has(product.categorySlug) ? "Dịch vụ" : "Sản phẩm";
  const filledStars = Math.round(product.rating);

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border-2 border-transparent bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_12px_28px_rgba(229,91,38,0.25),0_4px_10px_rgba(0,0,0,0.05)] sm:flex-row"
    >
      <div className="flex flex-row items-center gap-4 border-b border-dashed border-border-c p-4 sm:w-[220px] sm:shrink-0 sm:flex-col sm:border-b-0 sm:border-r">
        <div className="relative h-[100px] w-[100px] shrink-0 sm:h-[170px] sm:w-[170px]">
          <ProductThumbnail
            imageUrl={product.imageUrl}
            categorySlug={product.categorySlug}
            boxClassName="h-full w-full rounded bg-surface-alt ring-1 ring-border-c"
            iconClassName="h-12 w-12 text-foreground/70 sm:h-16 sm:w-16"
            sizes="170px"
          />
          <span className="absolute left-0 top-0 rounded bg-brand px-1.5 py-[3px] text-[10px] font-extrabold uppercase text-ink">
            Không trùng
          </span>
          {product.hot && (
            <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-brand px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-ink">
              <Crown className="h-2.5 w-2.5" /> Tài trợ
            </span>
          )}
        </div>
        <div className="min-w-0 text-left sm:mt-2 sm:w-full sm:text-center">
          <p className="text-sm font-bold text-success">Tồn kho: {product.stock}</p>
          <p className="mt-1 text-base font-extrabold text-foreground">
            {product.priceMax
              ? `${formatVnd(product.price)} - ${formatVnd(product.priceMax)}`
              : formatVnd(product.price)}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="mb-2">
          <span className="mr-1.5 inline-block rounded bg-brand px-2 py-0.5 align-middle text-xs font-bold text-ink">
            {typeLabel}
          </span>
          <span className="text-lg font-bold text-foreground group-hover:text-brand-dark">
            {product.name}
          </span>
        </div>

        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-sm text-foreground/80">
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < filledStars ? "fill-brand text-brand" : "fill-border-c text-border-c"
                }`}
              />
            ))}
          </span>
          <span>{product.reviewCount} đánh giá</span>
          <span className="text-muted">|</span>
          <span>
            Đã bán: <b className="font-bold text-success">{product.sold}</b>
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <span>Người bán:</span>
          <span className="font-bold text-success">{product.seller}</span>
          {product.verified && (
            <>
              <span className="text-muted">|</span>
              <span className="flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-ink">
                <BadgeCheck className="h-3.5 w-3.5" /> Đã xác thực
              </span>
            </>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-border-c" />

        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
          {product.shortDescription}
        </p>
      </div>
    </Link>
  );
}
