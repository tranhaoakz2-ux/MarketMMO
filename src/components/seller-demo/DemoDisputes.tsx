"use client";

import { AlertTriangle, Gavel, Loader2, Scale, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusBadge,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import { DISPUTES, DISPUTE_STATUS_META, type DemoDispute } from "@/components/seller-demo/mock";

function metaKey(d: DemoDispute): keyof typeof DISPUTE_STATUS_META {
  if (d.status === "OPEN") return d.phase === "SELLER_WARRANTY" ? "WARRANTY" : "PLATFORM";
  return d.status;
}

// Sơ đồ 3 giai đoạn xử lý khiếu nại (bảo hành → escalate → sàn xử lý 3 mức).
function FlowSteps() {
  const steps = [
    { icon: ShieldCheck, title: "Bạn bảo hành", sub: "24h tự hoàn / từ chối" },
    { icon: Gavel, title: "Đưa lên sàn", sub: "Khi bạn từ chối hoặc quá hạn" },
    { icon: Scale, title: "Sàn xử lý", sub: "Hoàn toàn bộ · một phần · giải ngân bạn" },
  ];
  return (
    <Card>
      <SectionTitle>Quy trình xử lý khiếu nại</SectionTitle>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-border-c bg-surface-alt p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-ink">
                <s.icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-foreground">
                  {i + 1}. {s.title}
                </p>
                <p className="text-[11px] text-muted">{s.sub}</p>
              </div>
            </div>
            {i < steps.length - 1 && <span className="hidden shrink-0 text-muted sm:block">→</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DemoDisputes() {
  const [disputes, setDisputes] = useState<DemoDispute[]>(DISPUTES);
  const [busy, setBusy] = useState<string | null>(null);

  const act = (id: string, action: "refund" | "reject") => {
    setBusy(id);
    setTimeout(() => {
      setDisputes((ds) =>
        ds.map((d) =>
          d.id === id
            ? action === "refund"
              ? { ...d, status: "RESOLVED_REFUND", resolvedAt: "hôm nay", refundAmount: d.amount }
              : { ...d, warrantyRejected: true, warrantyDeadline: "hết hạn" }
            : d
        )
      );
      setBusy(null);
    }, 350);
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
          <Card><EmptyState icon={ShieldCheck} title="Không có gì cần xử lý">Mọi khiếu nại bảo hành đã được giải quyết. 🎉</EmptyState></Card>
        ) : (
          warranty.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{d.productName}</p>
                  <p className="text-[11px] text-muted">
                    Mở bởi {d.buyerName} · {d.createdAt} · {formatVndDemo(d.amount)}
                  </p>
                </div>
                <StatusBadge tone={DISPUTE_STATUS_META[metaKey(d)].tone} dot>
                  {DISPUTE_STATUS_META[metaKey(d)].label}
                </StatusBadge>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{d.reason}</p>

              <div className="mt-3 rounded-xl border border-brand-dark/20 bg-brand-light/15 p-3 text-xs text-brand-dark">
                {d.warrantyRejected ? (
                  <>Bạn đã <b>từ chối bảo hành</b>. Người mua có thể đưa lên sàn — bạn vẫn có thể chủ động hoàn tiền.</>
                ) : (
                  <>Vui lòng xử lý trong thời gian bảo hành (<b>{d.warrantyDeadline}</b>). Quá hạn/từ chối, người mua sẽ đưa lên sàn.</>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="danger" disabled={busy === d.id} onClick={() => act(d.id, "refund")}>
                  {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Hoàn tiền cho người mua
                </Button>
                {!d.warrantyRejected && (
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
                  <p className="text-[11px] text-muted">Mở bởi {d.buyerName} · {d.createdAt} · {formatVndDemo(d.amount)}</p>
                </div>
                <StatusBadge tone="info" dot>Đang chờ sàn</StatusBadge>
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
                  {d.buyerName} · {formatVndDemo(d.amount)}
                  {d.refundAmount ? ` · hoàn ${formatVndDemo(d.refundAmount)}` : ""} · xử lý {d.resolvedAt}
                </p>
              </div>
              <StatusBadge tone={DISPUTE_STATUS_META[metaKey(d)].tone}>
                {DISPUTE_STATUS_META[metaKey(d)].label}
              </StatusBadge>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted">
        <AlertTriangle className="h-3.5 w-3.5 text-brand-dark" />
        Bấm thử &quot;Hoàn tiền&quot; / &quot;Từ chối&quot; ở trên để xem trạng thái đổi (demo).
      </div>
    </div>
  );
}
