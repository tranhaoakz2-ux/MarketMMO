import { MessageSquare, Star } from "lucide-react";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/seller-demo/DemoKit";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  hidden?: boolean;
};

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(rating) ? "fill-brand-dark text-brand-dark" : "fill-surface-alt text-border-c"}`}
        />
      ))}
    </div>
  );
}

export default function SellerReviewsList({ reviews }: { reviews: Review[] }) {
  // Thống kê CHỈ tính review chưa bị admin ẩn — khớp đúng số buyer nhìn
  // thấy công khai. Danh sách bên dưới vẫn hiện ĐỦ mọi review (kể cả bị
  // ẩn) kèm badge, để seller biết đầy đủ những gì đã nhận được.
  const visibleReviews = reviews.filter((r) => !r.hidden);
  const count = visibleReviews.length;
  const avg = count ? visibleReviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: visibleReviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đánh giá"
        subtitle="Đánh giá của người mua dành cho gian hàng của bạn (không thể chỉnh sửa/xoá)."
      />

      {reviews.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquare} title="Chưa có đánh giá">
            Gian hàng của bạn chưa có đánh giá nào.
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* Tổng quan */}
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
                <span className="text-5xl font-black tabular-nums text-foreground">{avg.toFixed(1)}</span>
                <Stars rating={avg} size="h-5 w-5" />
                <p className="text-xs text-muted">{count} đánh giá</p>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {dist.map((d) => (
                  <div key={d.star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 shrink-0 text-muted">{d.star}</span>
                    <Star className="h-3 w-3 shrink-0 fill-brand-dark text-brand-dark" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${count ? (d.n / count) * 100 : 0}%` }} />
                    </div>
                    <span className="w-4 shrink-0 text-right tabular-nums text-muted">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Danh sách */}
          <div className="flex flex-col gap-3">
            <SectionTitle>Tất cả đánh giá</SectionTitle>
            {reviews.map((r) => (
              <Card key={r.id} className={r.hidden ? "opacity-60" : ""}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-black text-muted">
                      {r.authorName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        {r.authorName}
                        {r.hidden && (
                          <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                            Admin đã ẩn
                          </span>
                        )}
                      </p>
                      <Stars rating={r.rating} size="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <span className="text-xs text-muted">{r.createdAt.toLocaleDateString("vi-VN")}</span>
                </div>
                <p className="mt-2.5 text-sm text-foreground/80">{r.comment}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
