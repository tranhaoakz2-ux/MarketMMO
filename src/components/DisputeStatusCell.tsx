"use client";

import { Clock, Loader2, MessageSquare, Scale, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConversationThread from "@/components/ConversationThread";

// Ô trạng thái khiếu nại ở /don-hang cho đơn đang DISPUTED (SECURITY_AUDIT #8
// Phần B + Phần 4 chat). `canEscalate` được tính SẴN Ở SERVER (so hạn bảo hành
// với giờ server) để tránh lệch giờ server/client. Nút "Trao đổi với người bán"
// mở modal chat THẬT gắn với đúng khiếu nại này (Cách B — tách chat chung).
export default function DisputeStatusCell({
  disputeId,
  phase,
  rejected,
  canEscalate,
  deadlineText,
}: {
  disputeId: string;
  phase: "SELLER_WARRANTY" | "PLATFORM";
  rejected: boolean;
  canEscalate: boolean;
  deadlineText: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const escalate = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/disputes/${disputeId}/escalate`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể đưa lên sàn.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-1 flex flex-col gap-1">
      {phase === "PLATFORM" ? (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-info">
          <Scale className="h-3 w-3" /> Đang chờ sàn xử lý
        </p>
      ) : (
        <>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-brand-dark">
            {rejected ? (
              <>
                <ShieldAlert className="h-3 w-3" /> Người bán đã từ chối bảo hành
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> Chờ người bán bảo hành
                {deadlineText ? ` (đến ${deadlineText})` : ""}
              </>
            )}
          </p>
          {canEscalate && (
            <button
              onClick={escalate}
              disabled={loading}
              className="flex w-fit items-center gap-1 rounded bg-danger px-2 py-1 text-[10px] font-bold text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Đưa lên sàn
            </button>
          )}
          {error && <p className="text-[10px] font-semibold text-danger">{error}</p>}
        </>
      )}

      <button
        onClick={() => setChatOpen(true)}
        className="flex w-fit items-center gap-1 text-[10px] font-semibold text-brand-dark hover:underline"
      >
        <MessageSquare className="h-3 w-3" /> Trao đổi với người bán
      </button>

      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setChatOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border-c bg-surface p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Trao đổi khiếu nại</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-foreground"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ConversationThread disputeId={disputeId} />
          </div>
        </div>
      )}
    </div>
  );
}
