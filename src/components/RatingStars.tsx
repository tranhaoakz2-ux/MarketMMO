import { Star } from "lucide-react";

export default function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} sao`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating);
        return (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              filled ? "fill-brand text-brand" : "fill-transparent text-border-c"
            }`}
            strokeWidth={filled ? 0 : 1.5}
          />
        );
      })}
    </div>
  );
}
