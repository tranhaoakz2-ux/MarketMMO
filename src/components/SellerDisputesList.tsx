"use client";

import { ArrowRight, ChevronDown, Gavel, Loader2, Scale, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatVnd } from "@/lib/format";
import { type DisputePhase, type DisputeStatus } from "@/lib/constants";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusBadge,
  Tone,
} from "@/components/seller-demo/DemoKit";

type Dispute = {
  id: string;
  reason: string;
  status: DisputeStatus;
  phase: DisputePhase;
  warrantyDeadline: Date | null;
  warrantyRejectedAt: Date | null;
  refundAmount: number | null;
  createdAt: Date;
  resolvedAt: Date | null;
  openedByName: string;
  productName: string;
  amount: number;
};

const STATUS_META: Record<string, { tone: Tone; label: string }> = {
  WARRANTY: { tone: "warn", label: "Chờ bạn bảo hành" },
  PLATFORM: { tone: "info", label: "Đang chờ sàn" },
  RESOLVED_REFUND: { tone: "danger", label: "Đã hoàn toàn bộ" },
  RESOLVED_PARTIAL: { tone: "info", label: "Đã hoàn một phần" },
  RESOLVED_RELEASE: { tone: "success", label: "Đã giải ngân bạn" },
};

function metaKey(d: Dispute): keyof typeof STATUS_META {
  if (d.status === "OPEN") return d.phase === "SELLER_WARRANTY" ? "WARRANTY" : "PLATFORM";
  return d.status;
}

// Sơ đồ 3 giai đoạn xử lý khiếu nại (bảo hành → escalate → sàn xử lý 3 mức).
const FLOW_STEPS = [
  { icon: ShieldCheck, title: "Bạn bảo hành", sub: "Bạn có 24 giờ để chủ động hoàn tiền hoặc từ chối yêu cầu." },
  { icon: Gavel, title: "Đưa lên sàn", sub: "Khi bạn từ chối hoặc quá hạn, người mua có thể đẩy lên sàn." },
  { icon: Scale, title: "Sàn xử lý", sub: "Admin chọn: hoàn toàn bộ · hoàn một phần · giải ngân cho bạn." },
];

function FlowSteps() {
  return (
    <Card padding="p-6">
      <SectionTitle>Quy trình xử lý khiếu nại</SectionTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {FLOW_STEPS.map((s, i) => (
          <div key={s.title} className="flex flex-col gap-4 sm:flex-1 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-border-c bg-surface-alt p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-ink shadow-sm">
                  <s.icon className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-dark/30 text-sm font-black text-brand-dark">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-base font-black text-foreground">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.sub}</p>
              </div>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className="flex shrink-0 items-center justify-center text-muted">
                <ArrowRight className="hidden h-6 w-6 sm:block" />
                <ChevronDown className="h-5 w-5 sm:hidden" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SellerDisputesList({ disputes }: { disputes: Dispute[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "refund" | "reject") => {
    if (
      action === "refund" &&
      !confirm("Hoàn TOÀN BỘ tiền cho người mua? Đơn vị kho đã giao sẽ bị huỷ (không bán lại được).")
    ) {
      return;
    }
    setBusy(id);
    const res = await fetch(`/api/seller/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      alert(data?.error ?? "Xử lý thất bại.");
      return;
    }
    router.refresh();
  };

  const warranty = disputes.filter((d) => d.status === "OPEN" && d.phase === "SELLER_WARRANTY");
  const platform = disputes.filter((d) => d.status === "OPEN" && d.phase === "PLATFORM");
  const resolved = disputes.filter((d) => d.status !== "OPEN");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Khiếu nại"
        subtitle="Người mua báo lỗi sẽ qua bạn bảo hành trước (24h). Từ chối hoặc quá hạn thì mới lên sàn."
      />

      <FlowSteps />

      {/* Cần bạn xử lý */}
      <div className="flex flex-col gap-3">
        <SectionTitle>Cần bạn xử lý ({warranty.length})</SectionTitle>
        {warranty.length === 0 ? (
          <Card>
            <EmptyState icon={ShieldCheck} title="Không có gì cần xử lý">
              Mọi khiếu nại bảo hành đã được giải quyết. 🎉
            </EmptyState>
          </Card>
        ) : (
          warranty.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{d.productName}</p>
                  <p className="text-[11px] text-muted">
                    Mở bởi {d.openedByName} · {d.createdAt.toLocaleString("vi-VN")} · {formatVnd(d.amount)}
                  </p>
                </div>
                <StatusBadge tone={STATUS_META[metaKey(d)].tone} dot>
                  {STATUS_META[metaKey(d)].label}
                </StatusBadge>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{d.reason}</p>

              <div className="mt-3 rounded-xl border border-brand-dark/20 bg-brand-light/15 p-3 text-xs text-brand-dark">
                {d.warrantyRejectedAt ? (
                  <>
                    Bạn đã <b>từ chối bảo hành</b>. Người mua có thể đưa lên sàn — bạn vẫn có thể chủ
                    động hoàn tiền.
                  </>
                ) : (
                  <>
                    Vui lòng xử lý
                    {d.warrantyDeadline ? ` trước ${d.warrantyDeadline.toLocaleString("vi-VN")}` : ""}. Quá
                    hạn hoặc nếu bạn từ chối, người mua sẽ đưa lên sàn.
                  </>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="danger" disabled={busy === d.id} onClick={() => act(d.id, "refund")}>
                  {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Hoàn tiền cho người mua
                </Button>
                {!d.warrantyRejectedAt && (
                  <Button variant="secondary" disabled={busy === d.id} onClick={() => act(d.id, "reject")}>
                    <X className="h-3.5 w-3.5" /> Từ chối bảo hành
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Đang chờ sàn */}
      {platform.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Đang chờ sàn xử lý ({platform.length})</SectionTitle>
          {platform.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{d.productName}</p>
                  <p className="text-[11px] text-muted">
                    Mở bởi {d.openedByName} · {d.createdAt.toLocaleString("vi-VN")} · {formatVnd(d.amount)}
                  </p>
                </div>
                <StatusBadge tone="info" dot>
                  Đang chờ sàn
                </StatusBadge>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{d.reason}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-info">
                <Scale className="h-3.5 w-3.5" /> Đã đưa lên sàn — chờ admin quyết định.
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Lịch sử */}
      {resolved.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Đã xử lý ({resolved.length})</SectionTitle>
          {resolved.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{d.productName}</p>
                <p className="text-[11px] text-muted">
                  {d.openedByName} · {formatVnd(d.amount)}
                  {d.refundAmount ? ` · hoàn ${formatVnd(d.refundAmount)}` : ""}
                  {d.resolvedAt ? ` · xử lý ${d.resolvedAt.toLocaleDateString("vi-VN")}` : ""}
                </p>
              </div>
              <StatusBadge tone={STATUS_META[metaKey(d)].tone}>{STATUS_META[metaKey(d)].label}</StatusBadge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
