"use client";

// Panel quản trị đánh giá (Review) — tìm kiếm + ẩn/hiện. KHÔNG xoá cứng
// (giữ lại làm bằng chứng), cùng pattern AdminForumReportsPanel đã có cho
// nội dung diễn đàn.
import { AlertTriangle, Eye, EyeOff, Loader2, MessageSquare, Search, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ListSkeleton,
  StatusBadge,
} from "@/components/admin-demo/AdminDemoKit";

type AdminReview = {
  id: string;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
  sellerName: string;
  sellerSlug: string;
  authorName: string;
};

export default function AdminReviewsPanel() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load("");
    })();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(q);
  };

  const toggleHidden = async (r: AdminReview) => {
    setBusyId(r.id);
    setRowError(null);
    const res = await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: r.hidden ? "unhide" : "hide" }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id: r.id, message: data?.error ?? "Không thể cập nhật." });
      return;
    }
    load(q);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--adm-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo nội dung, tên gian hàng, tên người đánh giá..."
            className="w-full rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--adm-text)] placeholder:text-[var(--adm-muted)] focus:border-[var(--adm-brand)] focus:outline-none"
          />
        </div>
        <Button type="submit" size="sm">
          Tìm kiếm
        </Button>
      </form>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : reviews.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquare} title="Không tìm thấy đánh giá nào">
            Thử từ khoá tìm kiếm khác.
          </EmptyState>
        </Card>
      ) : (
        <Card padding="p-0">
          <div className="flex flex-col divide-y divide-[var(--adm-border)]">
            {reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-0.5 text-xs font-bold text-[var(--adm-brand)]">
                        <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}
                      </span>
                      <p className="text-sm font-bold text-[var(--adm-text)]">{r.authorName}</p>
                      <span className="text-xs text-[var(--adm-muted)]">→</span>
                      <Link
                        href={`/shop/${r.sellerSlug}`}
                        target="_blank"
                        className="text-xs font-semibold text-[var(--adm-brand)] hover:underline"
                      >
                        {r.sellerName}
                      </Link>
                      {r.hidden && (
                        <StatusBadge tone="danger" dot>
                          Đã ẩn
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--adm-muted)]">{r.comment}</p>
                    <p className="mt-1 text-[11px] text-[var(--adm-muted)]">
                      {new Date(r.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={r.hidden ? "secondary" : "danger"}
                    disabled={busyId === r.id}
                    onClick={() => toggleHidden(r)}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : r.hidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Hiện lại
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Ẩn
                      </>
                    )}
                  </Button>
                </div>

                {rowError?.id === r.id && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--adm-danger)]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {rowError.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
