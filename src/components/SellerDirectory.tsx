"use client";

import { BadgeCheck, Calendar, Package, Search, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import RatingStars from "@/components/RatingStars";
import SellerAvatar from "@/components/SellerAvatar";
import SellerLevelBadge from "@/components/SellerLevelBadge";
import { formatVnd } from "@/lib/format";
import type { SellerLevelBadge as SellerLevelBadgeData } from "@/lib/seller-level";

// Shape phẳng, đã format sẵn phía server (page.tsx) — component này CHỈ lo
// hiển thị/sắp xếp/lọc, không tự gọi lại getAllSellersWithStats() hay tính
// toán gì liên quan tới dữ liệu gốc.
export type SellerCardData = {
  id: string;
  shopName: string;
  slug: string;
  description: string;
  level: number;
  levelBadge: SellerLevelBadgeData;
  verified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  productCount: number;
  avgRating: number;
  reviewCount: number;
  insuranceBalance: number;
  joinedLabel: string;
  createdAtMs: number;
};

type SortKey = "newest" | "level" | "rating" | "products";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Mới tham gia" },
  { value: "level", label: "Cấp độ cao nhất" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "products", label: "Nhiều sản phẩm nhất" },
];

function SellerDirectoryCard({ seller }: { seller: SellerCardData }) {
  return (
    <Link
      href={`/shop/${seller.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark hover:shadow-lg dark:bg-[var(--card-navy)]"
    >
      {/* Dải ảnh bìa — ảnh thật nếu seller đã upload (Trang Bán Hàng > Hồ sơ
          cá nhân), fallback gradient tông vàng thương hiệu thay vì để trống. */}
      <div className="relative h-24 w-full shrink-0 overflow-hidden sm:h-28">
        {seller.coverUrl ? (
          <Image src={seller.coverUrl} alt="" fill className="object-cover" sizes="380px" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-dark via-brand to-brand-light" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {/* Avatar đè lên mép dưới ảnh bìa (kiểu Facebook) — viền/đổ bóng qua
            prop `ring` có sẵn của SellerAvatar. */}
        <span className="relative -mt-9 inline-block w-fit shrink-0">
          <SellerAvatar avatarUrl={seller.avatarUrl} shopName={seller.shopName} size={72} shape="circle" ring />
          {seller.verified && (
            <span
              className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-info text-white ring-2 ring-surface"
              title="Đã xác thực"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </span>

        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand-dark">
            {seller.shopName}
          </h3>
          <SellerLevelBadge
            level={seller.levelBadge.level}
            name={seller.levelBadge.name}
            tone={seller.levelBadge.tone}
            className="mt-1.5"
          />
        </div>

        {seller.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">{seller.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border-c pt-3.5 text-xs">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Package className="h-3.5 w-3.5 text-muted" /> {seller.productCount} sản phẩm
          </span>
          {seller.reviewCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <RatingStars rating={seller.avgRating} />
              <span className="font-bold text-foreground">{seller.avgRating.toFixed(1)}</span>
              <span className="text-muted">({seller.reviewCount})</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted">
              <Star className="h-3.5 w-3.5" /> Chưa có đánh giá
            </span>
          )}
        </div>

        {/* Chỉ dấu tin cậy — quỹ bảo hiểm CHỈ hiện khi > 0 (không hiện "0đ" trơ
            trọi), ngày tham gia luôn có sẵn (Seller.createdAt không nullable). */}
        {(seller.insuranceBalance > 0 || seller.joinedLabel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            {seller.insuranceBalance > 0 && (
              <span className="flex items-center gap-1 font-semibold text-info">
                <ShieldCheck className="h-3.5 w-3.5" /> Quỹ bảo hiểm: {formatVnd(seller.insuranceBalance)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {seller.joinedLabel}
            </span>
          </div>
        )}

        <span className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-xs font-black text-white transition-colors group-hover:bg-brand-dark group-hover:text-ink">
          Xem gian hàng
        </span>
      </div>
    </Link>
  );
}

export default function SellerDirectory({ sellers }: { sellers: SellerCardData[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? sellers.filter((s) => s.shopName.toLowerCase().includes(q)) : sellers;

    const sorted = [...filtered];
    switch (sortKey) {
      case "level":
        sorted.sort((a, b) => b.level - a.level || b.avgRating - a.avgRating);
        break;
      case "rating":
        // Hạng người bán làm tiêu chí PHỤ (chỉ phân định khi rating bằng
        // nhau) — không đổi ý nghĩa "Đánh giá cao nhất" buyer đã chọn.
        sorted.sort((a, b) => b.avgRating - a.avgRating || b.level - a.level || b.reviewCount - a.reviewCount);
        break;
      case "products":
        sorted.sort((a, b) => b.productCount - a.productCount || b.level - a.level || b.avgRating - a.avgRating);
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
    }
    return sorted;
  }, [sellers, query, sortKey]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm gian hàng theo tên..."
            className="w-full rounded-full border border-border-c bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand-dark focus:outline-none"
          />
        </div>

        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
          Sắp xếp
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-border-c bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:border-brand-dark focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-c bg-surface p-12 text-center text-sm text-muted">
          Không tìm thấy gian hàng nào khớp &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((seller) => (
            <SellerDirectoryCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}
