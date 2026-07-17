"use client";

import Link from "next/link";
import { useState } from "react";
import RatingStars from "@/components/RatingStars";

type TabKey = "description" | "api" | "reviews";

const TAB_LABELS: Record<TabKey, string> = {
  description: "MÔ TẢ SẢN PHẨM",
  api: "TÍCH HỢP API",
  reviews: "ĐÁNH GIÁ (REVIEWS)",
};

export default function ProductInfoTabs({
  description,
  rating,
  reviewCount,
  sellerShopHref,
}: {
  description: string[];
  rating: number;
  reviewCount: number;
  sellerShopHref: string;
}) {
  const [tab, setTab] = useState<TabKey>("description");

  return (
    <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
      <div className="grid grid-cols-3">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-5 py-4 text-center text-sm font-bold transition sm:text-base ${
              tab === key ? "bg-ink text-white" : "bg-brand text-ink hover:bg-brand-dark"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tab === "description" && (
        <div className="flex flex-col gap-2 p-6 text-sm leading-relaxed text-ink/80">
          {description.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {tab === "api" && (
        <div className="flex flex-col gap-3 p-6 text-sm leading-relaxed text-ink/80">
          <p>
            Sản phẩm này hỗ trợ giao hàng/kích hoạt tự động qua hệ thống API của
            MarketMMO dành cho đối tác/nhà phát triển.
          </p>
          <Link href="/tai-lieu-api" className="font-semibold text-brand-dark hover:underline">
            Xem tài liệu tích hợp API →
          </Link>
        </div>
      )}

      {tab === "reviews" && (
        <div className="flex flex-col gap-3 p-6 text-sm text-ink/80">
          <div className="flex items-center gap-2">
            <RatingStars rating={rating} />
            <span className="font-bold text-ink">{rating.toFixed(1)}</span>
            <span className="text-muted">({reviewCount} đánh giá)</span>
          </div>
          <Link href={sellerShopHref} className="font-semibold text-brand-dark hover:underline">
            Xem đánh giá gian hàng →
          </Link>
        </div>
      )}
    </div>
  );
}
