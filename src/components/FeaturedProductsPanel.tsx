import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import type { Product } from "@/data/products";

export default function FeaturedProductsPanel({
  items,
  auctionCountdownAt,
  auctionOpenNow,
}: {
  items: Product[];
  auctionCountdownAt: Date | null;
  auctionOpenNow: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border-c bg-surface p-4 shadow-sm mmo-panel-section sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand pb-3">
        <h2 className="flex items-center">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#06b6cc_0%,#0ab6b0_50%,#10b693_100%)] px-[22px] py-[13px] text-[18px] font-semibold text-white shadow-[0_6px_16px_rgba(10,182,160,0.32)]">
            <Image src="/fire-icon.png" alt="" width={21} height={21} className="h-[21px] w-[21px]" />
            Sản Phẩm Nổi Bật
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3">
          {auctionCountdownAt && (
            <span className="flex items-center gap-1.5 font-bold text-danger">
              {auctionOpenNow ? "ĐẤU GIÁ ĐANG MỞ — KẾT THÚC SAU" : "ĐẤU GIÁ BẮT ĐẦU SAU"}
              <AuctionCountdown endAt={auctionCountdownAt} size="sm" />
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
