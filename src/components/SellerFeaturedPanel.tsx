import { ArrowRight, Store } from "lucide-react";
import Link from "next/link";
import SellerCarousel, { type SellerListItem } from "@/components/SellerCarousel";

export default function SellerFeaturedPanel({ items }: { items: SellerListItem[] }) {
  return (
    <div className="rounded-[10px] border border-border-c bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand pb-3">
        <h2 className="flex items-center gap-2 text-[14.4px] font-black text-foreground">
          <Store className="h-[30px] w-[30px] text-red-600" />
          <span className="rounded-full bg-brand px-2.5 py-1 text-ink">Các Seller Nổi Bật</span>
        </h2>

        <Link
          href="/nguoi-ban"
          className="flex items-center gap-1 text-xs font-bold text-foreground transition hover:text-brand-dark"
        >
          Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <SellerCarousel items={items} />
    </div>
  );
}
