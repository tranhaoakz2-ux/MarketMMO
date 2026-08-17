import Image from "next/image";
import Link from "next/link";
import { Star, Store } from "lucide-react";
import SellerAvatar from "@/components/SellerAvatar";

export type SellerListItem = {
  id: string;
  shopName: string;
  slug: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  level: number;
  verified: boolean;
  productCount: number;
  avgRating: number;
  reviewCount: number;
};

// Bố cục dải ảnh bìa + avatar tròn đè lên mép dưới — cùng cách xử lý với
// SellerDirectoryCard (trang /nguoi-ban), thay cho cách cũ nhét thẳng
// avatar (ảnh THƯỜNG LÀ HÌNH TRÒN) vào khung vuông h-[253px] full-bleed:
// avatar tròn không lấp kín góc vuông nên trước đây các seller không có
// ảnh bìa riêng bị hụt/trống góc, không đồng đều với thẻ có ảnh vuông.
function SellerCard({ seller }: { seller: SellerListItem }) {
  return (
    <Link
      href={`/shop/${seller.slug}`}
      className="group w-[187px] shrink-0 rounded-xl transition hover:-translate-y-0.5 sm:w-[204px]"
    >
      <div className="overflow-hidden rounded-xl border-2 border-brand bg-surface shadow-sm transition-shadow group-hover:shadow-md">
        <div className="relative h-[88px] w-full">
          {seller.coverUrl ? (
            <Image src={seller.coverUrl} alt="" fill sizes="204px" className="object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-dark via-brand to-brand-light" />
          )}
          <span
            className={`absolute right-1.5 top-1.5 rounded px-2 py-1 text-[11px] font-bold ${
              seller.verified ? "bg-ink text-white" : "bg-brand text-ink"
            }`}
          >
            {seller.verified ? "ĐÃ XÁC THỰC" : "SELLER"}
          </span>
        </div>

        <div className="flex flex-col items-center px-2.5 pb-3.5 text-center">
          <span className="-mt-7 shrink-0">
            <SellerAvatar avatarUrl={seller.avatarUrl} shopName={seller.shopName} size={64} shape="circle" ring />
          </span>

          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-brand-dark">
            {seller.shopName}
          </h3>
          <span className="mt-1 inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
            Level {seller.level}
          </span>

          <div className="mt-2 flex w-full items-center justify-between">
            <p className="flex items-center gap-1 text-[15px] font-black text-danger">
              <Star className="h-[15px] w-[15px] fill-danger text-danger" />
              {seller.avgRating > 0 ? seller.avgRating.toFixed(1) : "Mới"}
            </p>
            <span className="flex items-center gap-0.5 text-[13px] text-muted">
              <Store className="h-[15px] w-[15px]" /> {seller.productCount}
            </span>
          </div>
        </div>
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
