"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Buyer bấm xác nhận ĐÃ NHẬN HÀNG — mốc neo bắt đầu tính "Thời gian bảo
// hành" (OrderItem.receivedAt/warrantyExpiresAt, xem POST
// /api/orders/[orderItemId]/confirm-received). KHÁC nút "Nhận đơn" phía
// SELLER cho dịch vụ (SellerOrdersTable.tsx) — đặt tên khác hẳn để không
// nhầm actor/ý nghĩa.
export default function ConfirmReceivedButton({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderItemId}/confirm-received`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể xác nhận nhận hàng.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-1">
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="flex items-center gap-1 text-[10px] font-semibold text-success hover:underline disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        Xác nhận đã nhận hàng
      </button>
      {error && <p className="mt-0.5 text-[10px] font-semibold text-danger">{error}</p>}
    </div>
  );
}
