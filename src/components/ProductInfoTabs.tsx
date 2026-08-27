"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import RatingStars from "@/components/RatingStars";
import ReviewForm from "@/components/ReviewForm";

type TabKey = "description" | "warranty" | "reviews";

const TAB_LABELS: Record<TabKey, string> = {
  description: "MÔ TẢ SẢN PHẨM",
  warranty: "CHÍNH SÁCH BẢO HÀNH",
  reviews: "ĐÁNH GIÁ (REVIEWS)",
};

type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

export default function ProductInfoTabs({
  description,
  warrantyPolicy,
  rating,
  reviewCount,
  sellerShopHref,
  sellerId,
  productId,
  productReviews,
}: {
  description: string[];
  /** Chính sách bảo hành seller tự viết (Product.warrantyPolicy) — null/rỗng
      = seller chưa điền, hiện dòng mặc định thay vì để trống trơn. LUÔN
      render dạng text thuần (interpolation JSX, KHÔNG dangerouslySetInnerHTML)
      — nội dung do seller nhập, không được tin để render HTML/script. */
  warrantyPolicy: string | null;
  /** null = chưa có đánh giá THẬT nào cho sản phẩm này — hiện "Chưa có đánh
      giá" thay vì vẽ sao 0 sao (dễ hiểu nhầm là sản phẩm tệ). */
  rating: number | null;
  reviewCount: number;
  sellerShopHref: string;
  sellerId: string | null;
  productId: string;
  productReviews: ProductReview[];
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
        <div className="flex flex-col gap-2 p-6 text-sm leading-relaxed text-foreground/80">
          {description.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {tab === "warranty" && (
        <div className="p-6 text-sm leading-relaxed text-foreground/80">
          {warrantyPolicy && warrantyPolicy.trim() ? (
            // whitespace-pre-line giữ xuống dòng seller gõ MÀ KHÔNG cần
            // dangerouslySetInnerHTML — {warrantyPolicy} là interpolation JSX
            // thường, React tự escape mọi ký tự đặc biệt (<, >, &...), không
            // có cách nào seller chèn được HTML/script qua field này.
            <p className="whitespace-pre-line">{warrantyPolicy}</p>
          ) : (
            <p className="text-muted">
              Người bán chưa cung cấp chính sách bảo hành cho sản phẩm này. Vui
              lòng nhắn người bán trước khi mua.
            </p>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="flex flex-col gap-4 p-6 text-sm text-foreground/80">
          <div className="flex items-center gap-2">
            {rating !== null ? (
              <>
                <RatingStars rating={rating} />
                <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
                <span className="text-muted">({reviewCount} đánh giá)</span>
              </>
            ) : (
              <span className="text-muted">Chưa có đánh giá</span>
            )}
            <Link
              href={sellerShopHref}
              className="ml-auto text-xs font-semibold text-brand-dark hover:underline"
            >
              Xem gian hàng →
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-3">
              {productReviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-c bg-surface-alt p-6 text-center text-sm text-muted">
                  Chưa có bình luận nào — hãy là người đầu tiên chia sẻ trải
                  nghiệm về chất lượng sản phẩm này.
                </div>
              ) : (
                productReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-border-c bg-surface-alt p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar size={28} />
                      <span className="text-sm font-bold text-foreground">{review.authorName}</span>
                      <RatingStars rating={review.rating} />
                      <span className="ml-auto text-xs text-muted">
                        {review.createdAt.toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-foreground/80">{review.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {sellerId && <ReviewForm sellerId={sellerId} productId={productId} />}
          </div>
        </div>
      )}
    </div>
  );
}
