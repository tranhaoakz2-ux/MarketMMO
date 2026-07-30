"use client";

import { CheckCircle2, MessageSquare, Scale, X, XCircle } from "lucide-react";
import { useState } from "react";
import ConversationThread from "@/components/ConversationThread";
import type { DisputeStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

// Ô trạng thái cho khiếu nại "bảo hành sau giải ngân" (phase
// POST_RELEASE_WARRANTY) ở /don-hang — đơn giản hơn DisputeStatusCell (không
// có bước seller tự bảo hành/escalate, đi thẳng admin) vì tiền đền bù (nếu
// có) lấy từ quỹ bảo hiểm seller, không phải escrow.
export default function PostReleaseDisputeStatus({
  disputeId,
  status,
  refundAmount,
}: {
  disputeId: string;
  status: DisputeStatus;
  refundAmount: number | null;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="mt-1 flex flex-col gap-1">
      {status === "OPEN" && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-info">
          <Scale className="h-3 w-3" /> Đang chờ sàn xét duyệt bảo hành
        </p>
      )}
      {status === "RESOLVED_INSURANCE" && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-success">
          <CheckCircle2 className="h-3 w-3" /> Đã đền bù {formatVnd(refundAmount ?? 0)} từ quỹ bảo hiểm
        </p>
      )}
      {status === "RESOLVED_RELEASE" && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-danger">
          <XCircle className="h-3 w-3" /> Khiếu nại bảo hành đã bị từ chối
        </p>
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
              <h3 className="text-sm font-black text-foreground">Trao đổi khiếu nại bảo hành</h3>
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
