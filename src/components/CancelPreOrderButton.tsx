"use client";

import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Buyer TỰ HUỶ đơn đặt trước — chỉ hiện khi seller CHƯA giao (cha kiểm tra
// điều kiện trước khi render, xem /don-hang). Gọi POST
// /api/orders/[orderItemId]/cancel-preorder — hoàn 100% tiền về ví ngay nếu
// thành công; server tự chặn race nếu seller vừa giao đúng lúc bấm (xem
// refundPreOrderItem(), src/lib/preorder.ts).
export default function CancelPreOrderButton({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderItemId}/cancel-preorder`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    setConfirming(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể huỷ đơn.");
      return;
    }
    router.refresh();
  };

  if (confirming) {
    return (
      <div className="mt-1 flex flex-col items-start gap-1">
        <p className="text-[10px] font-semibold text-foreground">Huỷ và hoàn tiền ngay?</p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] font-bold text-danger hover:underline disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Xác nhận huỷ
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-[10px] font-semibold text-muted hover:underline"
          >
            Thôi
          </button>
        </div>
        {error && <p className="text-[10px] font-semibold text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-[10px] font-semibold text-danger hover:underline"
      >
        <XCircle className="h-3 w-3" /> Huỷ đặt trước
      </button>
      {error && <p className="mt-0.5 text-[10px] font-semibold text-danger">{error}</p>}
    </div>
  );
}
