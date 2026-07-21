import { AlertTriangle } from "lucide-react";
import { disputeStatusLabel, type DisputeStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

type Dispute = {
  id: string;
  reason: string;
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  openedByName: string;
  productName: string;
  amount: number;
};

const statusStyle: Record<DisputeStatus, string> = {
  OPEN: "bg-brand-light text-brand-dark",
  RESOLVED_REFUND: "bg-danger/10 text-danger",
  RESOLVED_RELEASE: "bg-success/10 text-success",
};

export default function SellerDisputesList({ disputes }: { disputes: Dispute[] }) {
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
      {disputes.map((d) => (
        <div key={d.id} className="rounded-xl border border-border-c bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">{d.productName}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[d.status]}`}>
              {disputeStatusLabel[d.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Mở bởi {d.openedByName} · {d.createdAt.toLocaleString("vi-VN")} ·{" "}
            {formatVnd(d.amount)}
          </p>
          <p className="mt-2 text-sm text-foreground/80">{d.reason}</p>
          {d.status !== "OPEN" && (
            <p className="mt-2 text-xs text-muted">
              Admin đã xử lý lúc {d.resolvedAt?.toLocaleString("vi-VN")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
