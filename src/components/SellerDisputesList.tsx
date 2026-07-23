"use client";

import { AlertTriangle, Loader2, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { disputeStatusLabel, type DisputePhase, type DisputeStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

type Dispute = {
  id: string;
  reason: string;
  status: DisputeStatus;
  phase: DisputePhase;
  warrantyDeadline: Date | null;
  warrantyRejectedAt: Date | null;
  createdAt: Date;
  resolvedAt: Date | null;
  openedByName: string;
  productName: string;
  amount: number;
};

const statusStyle: Record<DisputeStatus, string> = {
  OPEN: "bg-brand-light text-brand-dark",
  RESOLVED_REFUND: "bg-danger/10 text-danger",
  RESOLVED_PARTIAL: "bg-info/10 text-info",
  RESOLVED_RELEASE: "bg-success/10 text-success",
};

export default function SellerDisputesList({ disputes }: { disputes: Dispute[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, action: "refund" | "reject") => {
    if (action === "refund" && !confirm("Hoàn TOÀN BỘ tiền cho người mua? Đơn vị kho đã giao sẽ bị huỷ (không bán lại được).")) {
      return;
    }
    setBusyId(id);
    const res = await fetch(`/api/seller/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      alert(data?.error ?? "Xử lý thất bại.");
      return;
    }
    router.refresh();
  };

  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
        <AlertTriangle className="h-8 w-8 text-muted" />
        Gian hàng của bạn chưa có khiếu nại nào.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {disputes.map((d) => {
        const inWarranty = d.status === "OPEN" && d.phase === "SELLER_WARRANTY";
        const escalated = d.status === "OPEN" && d.phase === "PLATFORM";
        return (
          <div key={d.id} className="rounded-xl border border-border-c bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">{d.productName}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[d.status]}`}>
                {disputeStatusLabel[d.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Mở bởi {d.openedByName} · {d.createdAt.toLocaleString("vi-VN")} · {formatVnd(d.amount)}
            </p>
            <p className="mt-2 text-sm text-foreground/80">{d.reason}</p>

            {inWarranty && (
              <div className="mt-3 rounded-lg border border-brand-dark/20 bg-brand-light/20 p-3">
                {d.warrantyRejectedAt ? (
                  <p className="text-xs text-brand-dark">
                    Bạn đã <b>từ chối bảo hành</b>. Người mua có thể đưa khiếu nại lên sàn — bạn vẫn có
                    thể chủ động hoàn tiền trước khi đó.
                  </p>
                ) : (
                  <p className="text-xs text-brand-dark">
                    Người mua yêu cầu bảo hành. Vui lòng xử lý
                    {d.warrantyDeadline ? ` trước ${d.warrantyDeadline.toLocaleString("vi-VN")}` : ""}. Quá
                    hạn hoặc nếu bạn từ chối, người mua có thể đưa lên sàn để admin quyết định.
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => act(d.id, "refund")}
                    disabled={busyId === d.id}
                    className="flex items-center gap-1 rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busyId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Hoàn tiền cho người mua
                  </button>
                  {!d.warrantyRejectedAt && (
                    <button
                      onClick={() => act(d.id, "reject")}
                      disabled={busyId === d.id}
                      className="flex items-center gap-1 rounded-lg border border-border-c bg-surface px-3 py-1.5 text-xs font-bold text-foreground disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" /> Từ chối bảo hành
                    </button>
                  )}
                </div>
              </div>
            )}

            {escalated && (
              <p className="mt-2 text-xs font-semibold text-info">
                Đã đưa lên sàn — chờ admin quyết định.
              </p>
            )}

            {d.status !== "OPEN" && (
              <p className="mt-2 text-xs text-muted">Đã xử lý lúc {d.resolvedAt?.toLocaleString("vi-VN")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
