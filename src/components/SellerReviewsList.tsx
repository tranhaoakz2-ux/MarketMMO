import { MessageSquare } from "lucide-react";
import RatingStars from "@/components/RatingStars";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

export default function SellerReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
        <MessageSquare className="h-8 w-8 text-muted" />
        Gian hàng của bạn chưa có đánh giá nào.
      </div>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border-c bg-surface p-4 shadow-sm">
        <span className="text-2xl font-black text-foreground">{avg.toFixed(1)}</span>
        <div>
          <RatingStars rating={avg} />
          <p className="text-xs text-muted">{reviews.length} đánh giá</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border-c bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">{r.authorName}</p>
              <span className="text-xs text-muted">
                {r.createdAt.toLocaleDateString("vi-VN")}
              </span>
            </div>
            <RatingStars rating={r.rating} />
            <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
