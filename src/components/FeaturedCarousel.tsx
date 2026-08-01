import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import MegaSaleLogo from "@/components/MegaSaleLogo";
import ProductThumbnail from "@/components/ProductThumbnail";
import SellerAvatar from "@/components/SellerAvatar";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/data/products";

function FeaturedCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group w-[187px] shrink-0 rounded-xl p-[5px] transition hover:-translate-y-0.5 sm:w-[204px]"
    >
      <div className="relative">
        <ProductThumbnail
          imageUrl={product.imageUrl}
          categorySlug={product.categorySlug}
          boxClassName="h-[253px] w-full rounded-lg border-2 border-brand bg-surface-alt"
          iconClassName="h-16 w-16 text-foreground/70"
          sizes="204px"
        />
        <span
          className={`absolute rounded px-2 py-1 text-[11px] font-bold ${
            product.megaSale?.active ? "left-1 top-1" : "right-1 top-1"
          } ${product.featuredViaAuction ? "bg-ink text-white" : "bg-brand text-ink"}`}
        >
          {product.featuredViaAuction ? "ĐẤU GIÁ NGAY" : "TÀI TRỢ"}
        </span>
        {product.megaSale?.active && (
          <span className="absolute -right-2 -top-2">
            <MegaSaleLogo size={64} className="h-14 w-14 sm:h-16 sm:w-16" />
          </span>
        )}
        <div className="absolute -bottom-2 left-2 ring-2 ring-white rounded-full">
          <SellerAvatar avatarUrl={product.sellerAvatarUrl} shopName={product.seller} size={25} />
        </div>
      </div>
      <h3 className="mt-[13px] line-clamp-2 text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-brand-dark">
        {product.name}
      </h3>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[15px] font-black text-danger">
          {product.megaSale?.active ? (
            <>
              {formatVnd(product.megaSale.salePrice)}
              <span className="ml-1 text-[11px] font-semibold text-muted line-through">
                {formatVnd(product.price)}
              </span>
            </>
          ) : (
            <>
              {formatVnd(product.price)}
              {product.priceMax ? " -..." : ""}
            </>
          )}
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
