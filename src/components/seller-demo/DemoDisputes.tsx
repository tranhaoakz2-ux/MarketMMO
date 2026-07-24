"use client";

import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Gavel,
  Loader2,
  MessageSquare,
  Scale,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TextInput,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import {
  DISPUTES,
  DISPUTE_CHATS,
  DISPUTE_STATUS_META,
  type DemoDispute,
} from "@/components/seller-demo/mock";

function metaKey(d: DemoDispute): keyof typeof DISPUTE_STATUS_META {
  if (d.status === "OPEN") return d.phase === "SELLER_WARRANTY" ? "WARRANTY" : "PLATFORM";
  return d.status;
}

// Sơ đồ 3 giai đoạn xử lý khiếu nại (bảo hành → escalate → sàn xử lý 3 mức).
// Phóng to cho seller dễ đọc: icon lớn, tiêu đề to, padding thoáng; desktop 3
// bước ngang có mũi tên nối, mobile xếp dọc.
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

// Ô chat buyer↔seller trong thẻ khiếu nại (thu gọn/mở rộng). DEMO: dữ liệu giả.
// Trang thật sẽ nối vào hệ chat sẵn có (Conversation/Message) — xem ghi chú.
function DisputeChat({ disputeId, open, onToggle }: { disputeId: string; open: boolean; onToggle: () => void }) {
  const msgs = DISPUTE_CHATS[disputeId] ?? [];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border-c bg-surface-alt">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold text-foreground transition hover:bg-border-c/40"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-brand-dark" /> Trao đổi với người mua ({msgs.length})
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border-c p-3">
          <p className="mb-2 flex items-center gap-1 text-[10px] text-muted">
            <Scale className="h-3 w-3" /> Luồng riêng cho khiếu nại này — tách khỏi tin nhắn chung (Chat).
          </p>
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.from === "seller" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                    m.from === "seller"
                      ? "rounded-br-sm bg-brand text-ink"
                      : "rounded-bl-sm border border-border-c bg-surface text-foreground"
                  }`}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[10px] text-muted">
                  {m.from === "seller" ? "Bạn" : "Người mua"} · {m.time}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <TextInput placeholder="Nhập tin nhắn cho người mua..." className="text-xs" />
            <Button size="sm" className="shrink-0"><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoDisputes() {
  const [disputes, setDisputes] = useState<DemoDispute[]>(DISPUTES);
  const [busy, setBusy] = useState<string | null>(null);
  // Mở sẵn ô chat của khiếu nại đầu để dễ xem bố cục (demo).
  const [openChat, setOpenChat] = useState<Record<string, boolean>>({ dp1: true });
  const toggleChat = (id: string) => setOpenChat((s) => ({ ...s, [id]: !s[id] }));

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

              <DisputeChat
                disputeId={d.id}
                open={!!openChat[d.id]}
                onToggle={() => toggleChat(d.id)}
              />
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
