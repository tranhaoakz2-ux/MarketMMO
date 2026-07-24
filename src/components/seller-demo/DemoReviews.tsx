import { MessageSquare, Star } from "lucide-react";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
} from "@/components/seller-demo/DemoKit";
import { REVIEWS } from "@/components/seller-demo/mock";

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

export default function DemoReviews() {
  const count = REVIEWS.length;
  const avg = count ? REVIEWS.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: REVIEWS.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đánh giá"
        subtitle="Đánh giá của người mua dành cho gian hàng của bạn (không thể chỉnh sửa/xoá)."
      />

      {count === 0 ? (
        <Card><EmptyState icon={MessageSquare} title="Chưa có đánh giá">Gian hàng của bạn chưa có đánh giá nào.</EmptyState></Card>
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
            {REVIEWS.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-black text-muted">
                      {r.authorName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{r.authorName}</p>
                      <Stars rating={r.rating} size="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <span className="text-xs text-muted">{r.createdAt}</span>
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
