import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import Avatar from "@/components/Avatar";
import ProductThumbnail from "@/components/ProductThumbnail";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/data/products";

function FeaturedCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="w-[187px] shrink-0 rounded-xl p-[5px] transition hover:-translate-y-0.5 sm:w-[204px]"
    >
      <div className="relative">
        <ProductThumbnail
          imageUrl={product.imageUrl}
          categorySlug={product.categorySlug}
          boxClassName="h-[253px] w-full rounded-lg border-2 border-brand bg-surface-alt"
          iconClassName="h-16 w-16 text-ink/70"
          sizes="204px"
        />
        <span
          className={`absolute right-1 top-1 rounded px-2 py-1 text-[11px] font-bold ${
            product.featuredViaAuction ? "bg-ink text-white" : "bg-brand text-ink"
          }`}
        >
          {product.featuredViaAuction ? "ĐẤU GIÁ NGAY" : "TÀI TRỢ"}
        </span>
        <div className="absolute -bottom-2 left-2 ring-2 ring-white rounded-full">
          <Avatar size={25} />
        </div>
      </div>
      <h3 className="mt-[13px] line-clamp-2 text-[15px] font-bold leading-snug text-ink">
        {product.name}
      </h3>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[15px] font-black text-danger">
          {formatVnd(product.price)}
          {product.priceMax ? " -..." : ""}
        </p>
        <span className="flex items-center gap-0.5 text-[13px] text-muted">
          <ShoppingBag className="h-[15px] w-[15px]" /> {product.sold}
        </span>
      </div>
    </Link>
  );
}

export default function FeaturedCarousel({ items }: { items: Product[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Chưa có sản phẩm nổi bật.
      </p>
    );
  }

  // Track nội dung nhân đôi để animation CSS lặp liền mạch (xem
  // .animate-marquee-right trong globals.css). Tốc độ tỉ lệ theo số lượng
  // sản phẩm để nhịp trôi luôn đều, không phụ thuộc dữ liệu.
  const durationSeconds = Math.max(18, items.length * 4);

  return (
    <div className="overflow-hidden">
      <div
        className="animate-marquee-right flex w-max gap-[15px]"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {[...items, ...items].map((product, i) => (
          <FeaturedCard key={`${product.id}-${i}`} product={product} />
        ))}
      </div>
    </div>
  );
}
