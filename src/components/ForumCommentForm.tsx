"use client";

import { LogIn, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForumCommentForm({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-c bg-surface-alt p-6 text-center">
        <p className="text-sm text-muted">
          Đăng nhập để tham gia bình luận trong bài viết này.
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

    if (content.trim().length < 2) {
      setError("Bình luận quá ngắn.");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/forum/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Không thể gửi bình luận.");
      return;
    }

    setContent("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-c bg-surface p-4 shadow-sm">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Viết bình luận của bạn..."
        className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm focus:border-brand-dark focus:outline-none"
      />

      {error && (
        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-3 flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-xs font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" /> {loading ? "Đang gửi..." : "Gửi bình luận"}
      </button>
    </form>
  );
}
