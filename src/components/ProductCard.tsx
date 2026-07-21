import { BadgeCheck, Clock, Eye, Flame, PackageCheck } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ProductThumbnail from "@/components/ProductThumbnail";
import type { Product } from "@/data/products";
import { formatVnd } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border-2 border-brand bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark hover:shadow-[0_12px_28px_rgba(224,196,0,0.35),0_4px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="flex gap-[15px] p-[15px]">
        <div className="relative shrink-0">
          <ProductThumbnail
            imageUrl={product.imageUrl}
            categorySlug={product.categorySlug}
            boxClassName="h-24 w-24 rounded-md bg-surface-alt ring-1 ring-border-c sm:h-[120px] sm:w-[120px]"
            iconClassName="h-10 w-10 text-ink/70 sm:h-12 sm:w-12"
            sizes="120px"
          />
          <span className="absolute left-0 top-0 rounded-br-lg bg-brand px-2.5 py-1 text-[11px] font-black text-ink">
            {product.categoryLabel}
          </span>
          {product.hot && (
            <span className="absolute -right-1.5 -top-1.5 flex items-center gap-0.5 rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
              <Flame className="h-2.5 w-2.5" /> HOT
            </span>
          )}
          {product.preOrder && (
            <span className="absolute -bottom-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-info px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
              <Clock className="h-2.5 w-2.5" /> ĐẶT TRƯỚC
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-brand-dark">
            {product.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Avatar size={16} />
            <span className="truncate">{product.seller}</span>
            {product.verified && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                <BadgeCheck className="h-3 w-3" /> Đã xác thực
              </span>
            )}
          </div>

          <p className="mt-1.5 line-clamp-1 text-[11px] text-muted">
            {product.shortDescription}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-c px-[15px] py-2.5">
        <div className="flex flex-col gap-0.5 text-[13px] text-muted">
          <span className="flex items-center gap-1">
            <PackageCheck className="h-3.5 w-3.5" /> Kho: {product.stock} · Đã bán{" "}
            {product.sold}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {product.views.toLocaleString("vi-VN")}{" "}
            lượt xem
          </span>
        </div>
        <div className="shrink-0 text-lg font-bold text-danger">
          {product.priceMax
            ? `${formatVnd(product.price)} - ${formatVnd(product.priceMax)}`
            : formatVnd(product.price)}
        </div>
      </div>
    </Link>
  );
}
