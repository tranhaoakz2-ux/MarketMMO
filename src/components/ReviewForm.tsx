"use client";

import { Check, LogIn, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewForm({ sellerId }: { sellerId: string }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-c bg-surface-alt p-6 text-center">
        <p className="text-sm text-muted">
          Bạn cần đăng nhập và đã từng mua hàng ở gian hàng này để gửi đánh
          giá.
        </p>
        <Link
          href="/dang-nhap"
          className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-black text-ink transition hover:bg-brand-dark"
        >
          <LogIn className="h-3.5 w-3.5" /> Đăng nhập
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1) {
      setError("Vui lòng chọn số sao đánh giá.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, rating, comment }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Không thể gửi đánh giá.");
      return;
    }

    setSuccess(true);
    setComment("");
    setRating(0);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border-c bg-surface p-4 shadow-sm"
    >
      <p className="mb-2 text-sm font-bold text-ink">Đánh giá gian hàng này</p>

      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${star} sao`}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoverRating || rating)
                  ? "fill-brand text-brand"
                  : "fill-transparent text-border-c"
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Chia sẻ trải nghiệm mua hàng của bạn tại gian hàng này..."
        className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm focus:border-brand-dark focus:outline-none"
      />

      {error && (
        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5" /> Cảm ơn bạn đã đánh giá!
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-full bg-brand px-5 py-2 text-xs font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </form>
  );
}
