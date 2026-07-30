"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OpenDisputeButton({
  orderItemId,
  variant = "escrow",
}: {
  orderItemId: string;
  /** "post_release" = đơn đã giải ngân, khiếu nại đi thẳng admin (đền bù từ
      quỹ bảo hiểm seller nếu duyệt) — khác "escrow" (mặc định) vẫn qua bước
      seller tự bảo hành trước. Chỉ đổi copy hiển thị, cùng 1 API. */
  variant?: "escrow" | "post_release";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError("Vui lòng mô tả lý do khiếu nại (tối thiểu 10 ký tự).");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, reason: reason.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể gửi khiếu nại.");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-danger hover:underline"
      >
        <AlertTriangle className="h-3 w-3" /> Báo lỗi / yêu cầu bảo hành
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex w-56 flex-col gap-1.5 rounded-lg border border-danger/30 bg-danger/5 p-2">
      <p className="text-[10px] text-muted">
        {variant === "post_release" ? (
          <>
            Đơn đã giải ngân cho người bán — yêu cầu bảo hành sẽ gửi{" "}
            <b className="text-foreground">thẳng tới sàn xét duyệt</b>, đền bù (nếu có) trích từ quỹ
            bảo hiểm của người bán.
          </>
        ) : (
          <>
            Yêu cầu gửi tới <b className="text-foreground">người bán bảo hành trước</b>. Nếu người bán
            từ chối hoặc quá 24h, bạn có thể đưa khiếu nại lên sàn.
          </>
        )}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Mô tả vấn đề (tối thiểu 10 ký tự)"
        rows={2}
        className="w-full rounded border border-border-c px-2 py-1 text-[11px] focus:border-danger focus:outline-none"
      />
      {error && <p className="text-[10px] font-semibold text-danger">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-1 rounded bg-danger px-2 py-1 text-[10px] font-bold text-white disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Gửi yêu cầu
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded bg-surface-alt px-2 py-1 text-[10px] font-bold text-foreground"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
