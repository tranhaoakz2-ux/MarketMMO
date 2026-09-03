import { ArrowRight, Store } from "lucide-react";
import Link from "next/link";
import SellerCarousel, { type SellerListItem } from "@/components/SellerCarousel";

export default function SellerFeaturedPanel({ items }: { items: SellerListItem[] }) {
  return (
    <div className="rounded-[10px] border border-border-c bg-surface p-4 shadow-sm mmo-panel-section sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand pb-3">
        <h2 className="flex items-center">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#1fcde9_0%,#0cb9c6_45%,#14c096_100%)] px-[22px] py-[13px] text-[18px] font-semibold text-white shadow-[0_6px_18px_rgba(20,190,180,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]">
            <Store className="h-[21px] w-[21px]" />
            Các Seller Nổi Bật
          </span>
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
