import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import type { Product } from "@/data/products";

export default function FeaturedProductsPanel({
  items,
  nextAuctionEndAt,
}: {
  items: Product[];
  nextAuctionEndAt: Date | null;
}) {
  return (
    <div className="rounded-[10px] border border-border-c bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand pb-3">
        <h2 className="flex items-center gap-2 text-[14.4px] font-black text-ink">
          <Image src="/fire-icon.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="rounded-full bg-brand px-2.5 py-1 text-ink">Sản Phẩm Nổi Bật</span>
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3">
          {nextAuctionEndAt && (
            <span className="flex items-center gap-1.5 font-bold text-danger">
              ĐẤU GIÁ BẮT ĐẦU SAU
              <AuctionCountdown endAt={nextAuctionEndAt} size="sm" />
            </span>
          )}
          <Link
            href="/dau-gia"
            className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 font-bold text-white transition hover:bg-indigo-700"
          >
            <Zap className="h-3.5 w-3.5" /> Vào đấu giá
          </Link>
          <span className="rounded-full bg-brand px-2 py-1 font-black text-ink">
            HOT
          </span>
        </div>
      </div>

      <FeaturedCarousel items={items} />
    </div>
  );
}
