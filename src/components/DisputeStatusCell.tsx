"use client";

import { Clock, Loader2, ShieldAlert, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Ô trạng thái khiếu nại ở /don-hang cho đơn đang DISPUTED (SECURITY_AUDIT #8
// Phần B). `canEscalate` được tính SẴN Ở SERVER (so hạn bảo hành với giờ server)
// để tránh lệch giờ server/client — client chỉ hiển thị + gọi escalate.
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

  if (phase === "PLATFORM") {
    return (
      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-info">
        <Scale className="h-3 w-3" /> Đang chờ sàn xử lý
      </p>
    );
  }

  // phase SELLER_WARRANTY
  return (
    <div className="mt-1 flex flex-col gap-1">
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
    </div>
  );
}
