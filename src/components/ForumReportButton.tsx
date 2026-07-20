"use client";

import { Flag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Nút "Báo cáo" cho 1 bài viết HOẶC 1 bình luận diễn đàn — đúng 1 trong 2
// prop phải truyền. Gửi lên POST /api/forum/report, admin xử lý tại
// Admin > Diễn đàn (ẩn nội dung hoặc bỏ qua).
export default function ForumReportButton({
  postId,
  commentId,
}: {
  postId?: string;
  commentId?: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleOpen = () => {
    if (!session) {
      router.push("/dang-nhap");
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    const res = await fetch("/api/forum/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, commentId, reason }),
    });
    setSending(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
    }
  };

  if (done) {
    return <span className="text-[11px] font-semibold text-success">Đã gửi báo cáo, cảm ơn bạn.</span>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-danger"
      >
        <Flag className="h-3 w-3" /> Báo cáo
      </button>
      {open && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 top-6 z-20 w-64 rounded-xl border border-border-c bg-surface p-3 shadow-lg"
        >
          <p className="mb-1.5 text-xs font-bold text-ink">Báo cáo nội dung này</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do báo cáo..."
            rows={2}
            className="w-full rounded-lg border border-border-c px-2 py-1.5 text-xs text-ink outline-none focus:border-brand-dark"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted hover:bg-surface-alt"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={sending || !reason.trim()}
              className="rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {sending ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
