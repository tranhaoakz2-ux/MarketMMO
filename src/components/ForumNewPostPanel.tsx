"use client";

import { PenSquare, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FORUM_CATEGORIES } from "@/lib/constants";

export default function ForumNewPostPanel() {
  const { data: session } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(FORUM_CATEGORIES[1]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!session) {
      router.push("/dang-nhap");
      return;
    }
    setOpen((v) => !v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 5) {
      setError("Tiêu đề phải có ít nhất 5 ký tự.");
      return;
    }
    if (content.trim().length < 10) {
      setError("Nội dung phải có ít nhất 10 ký tự.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, content }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Không thể đăng bài.");
      return;
    }

    router.push(`/dien-dan/${data.id}`);
  };

  return (
    <div className="flex w-full flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-xs font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <PenSquare className="h-3.5 w-3.5" />}
        {open ? "Đóng" : "Đăng bài mới"}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 mt-3 w-full rounded-2xl border border-border-c bg-surface p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề bài viết"
              className="flex-1 rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof FORUM_CATEGORIES)[number])}
              className="rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              {FORUM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Nội dung bài viết..."
            className="mt-3 w-full rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
          />

          {error && (
            <p className="mt-2.5 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-3.5 rounded-full bg-brand px-5 py-2.5 text-xs font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
          >
            {loading ? "Đang đăng..." : "Đăng bài"}
          </button>
        </form>
      )}
    </div>
  );
}
