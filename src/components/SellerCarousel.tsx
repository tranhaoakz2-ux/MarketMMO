import Link from "next/link";
import { Star, Store } from "lucide-react";

export type SellerListItem = {
  id: string;
  shopName: string;
  slug: string;
  level: number;
  verified: boolean;
  productCount: number;
  avgRating: number;
  reviewCount: number;
};

function SellerCard({ seller }: { seller: SellerListItem }) {
  return (
    <Link
      href={`/shop/${seller.slug}`}
      className="group w-[187px] shrink-0 rounded-xl p-[5px] transition hover:-translate-y-0.5 sm:w-[204px]"
    >
      <div className="relative">
        <span className="grid h-[253px] w-full place-items-center rounded-lg border-2 border-brand bg-surface-alt text-6xl font-black text-foreground/70">
          {seller.shopName.charAt(0).toUpperCase()}
        </span>
        <span
          className={`absolute right-1 top-1 rounded px-2 py-1 text-[11px] font-bold ${
            seller.verified ? "bg-ink text-white" : "bg-brand text-ink"
          }`}
        >
          {seller.verified ? "ĐÃ XÁC THỰC" : "SELLER"}
        </span>
        <span className="absolute -bottom-2 left-2 grid h-[25px] w-[25px] place-items-center rounded-full bg-ink text-[11px] font-bold text-white ring-2 ring-white">
          {seller.level}
        </span>
      </div>
      <h3 className="mt-[13px] line-clamp-2 text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-brand-dark">
        {seller.shopName}
      </h3>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="flex items-center gap-1 text-[15px] font-black text-danger">
          <Star className="h-[15px] w-[15px] fill-danger text-danger" />
          {seller.avgRating > 0 ? seller.avgRating.toFixed(1) : "Mới"}
        </p>
        <span className="flex items-center gap-0.5 text-[13px] text-muted">
          <Store className="h-[15px] w-[15px]" /> {seller.productCount}
        </span>
      </div>
    </Link>
  );
}

export default function SellerCarousel({ items }: { items: SellerListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Chưa có người bán nào.
      </p>
    );
  }

  // Kỹ thuật marquee (nhân đôi track, chạy từ 0% -> -50%) chỉ liền mạch khi
  // MỘT bản sao đã đủ rộng để lấp đầy khung nhìn — nếu không, khi track dịch
  // gần tới -50%, phần rìa phải bản sao thứ 2 sẽ trống (đúng lỗi seller list
  // ngắn hơn "Sản phẩm nổi bật" đang gặp: 4 seller ~876px < bề rộng khung
  // panel ~1400px). Khắc phục bằng cách lặp lại danh sách seller đủ nhiều
  // lần thành 1 "block" rộng hơn khung nhìn lớn nhất có thể (ước lượng dựa
  // trên --container-7xl ~1472px, dùng mốc an toàn 1600px), rồi mới nhân đôi
  // block đó để cuộn vô hạn không lộ khoảng trắng, bất kể danh sách gốc dài
  // ngắn thế nào.
  const CARD_UNIT_PX = 204 + 15; // bề rộng thẻ (sm:w-[204px]) + gap-[15px]
  const MIN_BLOCK_WIDTH_PX = 1600;
  const repeats = Math.max(
    1,
    Math.ceil(MIN_BLOCK_WIDTH_PX / (items.length * CARD_UNIT_PX))
  );
  const block = Array.from({ length: repeats }, () => items).flat();

  // Cùng hệ số 4s/phần tử với FeaturedCarousel — vì bề rộng track và duration
  // cùng tỉ lệ thuận theo số phần tử trong block, tốc độ px/giây luôn không
  // đổi dù `repeats` là bao nhiêu, nên vẫn khớp tốc độ với "Sản phẩm nổi
  // bật" sau khi lặp block để lấp khoảng trống.
  const durationSeconds = block.length * 4;

  return (
    <div className="overflow-hidden">
      <div
        className="animate-marquee-left flex w-max gap-[15px]"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {[...block, ...block].map((seller, i) => (
          <SellerCard key={`${seller.id}-${i}`} seller={seller} />
        ))}
      </div>
    </div>
  );
}
