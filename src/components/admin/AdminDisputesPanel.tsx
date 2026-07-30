"use client";

// Panel THẬT "Khiếu nại" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoDisputes.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT (thao tác đụng tiền + xem nội dung nhạy cảm): fetch GET
// /api/admin/disputes, GET /api/admin/disputes/[id]/delivered (có ghi audit
// log phía server mỗi lần xem), POST /api/admin/disputes/[id]
// {action:"refund_buyer"|"release_seller"|"partial_refund", refundPercent?}
// — không đổi 1 dòng logic nghiệp vụ. API route đã có sẵn requireAdmin()
// (không đụng tới).
import { Eye, Inbox, Scale, Shield, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, PageHeader, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";

type Dispute = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED_REFUND" | "RESOLVED_PARTIAL" | "RESOLVED_RELEASE" | "RESOLVED_INSURANCE";
  phase: "PLATFORM" | "POST_RELEASE_WARRANTY";
  createdAt: string;
  openedBy: { email: string | null; username: string | null; name: string | null };
  orderItem: {
    productName: string;
    price: number;
    quantity: number;
    product: { seller: { shopName: string; insuranceBalance: number } } | null;
  };
};

const RESOLVED_LABEL: Record<string, { label: string; className: string }> = {
  RESOLVED_REFUND: { label: "Đã hoàn toàn bộ", className: "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]" },
  RESOLVED_PARTIAL: { label: "Đã hoàn một phần", className: "bg-[var(--adm-surface-2)] text-[var(--adm-brand)]" },
  RESOLVED_RELEASE: { label: "Đã giải ngân seller", className: "bg-[var(--adm-success-bg)] text-[var(--adm-success)]" },
  RESOLVED_INSURANCE: { label: "Đã đền từ quỹ bảo hiểm", className: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]" },
};

// Bấm vào 1 dòng khiếu nại mở modal chi tiết đầy đủ (thay vì action button
// ngay trên dòng) — khớp bản demo Artifact đã được duyệt. openId=null nghĩa
// là đang không mở modal nào.
export default function AdminDisputesPanel({ openId }: { openId?: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(openId ?? null);
  // Nội dung đã giao chỉ tải theo yêu cầu (nút riêng, có ghi audit) — KHÔNG đi
  // kèm danh sách khiếu nại. null = chưa xem; [] hợp lệ nếu đơn không có kho thật.
  const [delivered, setDelivered] = useState<string[] | null>(null);
  const [deliveredLoading, setDeliveredLoading] = useState(false);
  const [deliveredEmpty, setDeliveredEmpty] = useState(false);
  // Hoàn một phần: mở ô nhập % + giá trị (chuỗi để nhập tự do, validate khi gửi).
  const [showPartial, setShowPartial] = useState(false);
  const [partialPct, setPartialPct] = useState("");
  // Đền từ quỹ bảo hiểm (phase POST_RELEASE_WARRANTY): số tiền nhập tự do,
  // validate khi gửi (1 đến min(giá trị đơn, số dư bảo hiểm hiện có)).
  const [insuranceAmount, setInsuranceAmount] = useState("");

  const resetModalExtras = () => {
    setDelivered(null);
    setDeliveredEmpty(false);
    setShowPartial(false);
    setPartialPct("");
    setInsuranceAmount("");
  };

  const openDispute = (id: string) => {
    setActiveId(id);
    resetModalExtras();
  };

  const closeModal = () => {
    setActiveId(null);
    resetModalExtras();
  };

  const viewDelivered = async (id: string) => {
    setDeliveredLoading(true);
    setDeliveredEmpty(false);
    const res = await fetch(`/api/admin/disputes/${id}/delivered`);
    if (res.ok) {
      const data = await res.json();
      let lines: string[] = [];
      if (data.deliveredPayload) {
        try {
          const parsed = JSON.parse(data.deliveredPayload);
          lines = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          lines = [String(data.deliveredPayload)];
        }
      }
      setDelivered(lines);
      setDeliveredEmpty(lines.length === 0);
    }
    setDeliveredLoading(false);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/disputes");
    if (res.ok) {
      const data = await res.json();
      setDisputes(data.disputes);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleAction = async (
    id: string,
    action: "refund_buyer" | "release_seller" | "partial_refund" | "refund_from_insurance" | "reject_claim",
    extra?: Record<string, unknown>
  ) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Xử lý thất bại.");
      return;
    }
    closeModal();
    load();
  };

  const submitPartial = () => {
    if (!active) return;
    const pct = Number(partialPct);
    if (!Number.isInteger(pct) || pct < 1 || pct > 99) {
      alert("Tỉ lệ hoàn phải là số nguyên từ 1 đến 99 (%).");
      return;
    }
    handleAction(active.id, "partial_refund", { refundPercent: pct });
  };

  const submitInsuranceRefund = () => {
    if (!active) return;
    const lineTotal = active.orderItem.price * active.orderItem.quantity;
    const cap = Math.min(lineTotal, active.orderItem.product?.seller.insuranceBalance ?? 0);
    const value = Number(insuranceAmount);
    if (!Number.isInteger(value) || value < 1 || value > cap) {
      alert(`Số tiền đền bù phải là số nguyên từ 1 đến ${cap.toLocaleString("vi-VN")}đ.`);
      return;
    }
    handleAction(active.id, "refund_from_insurance", { amount: value });
  };

  const openDisputes = disputes.filter((d) => d.status === "OPEN");
  const resolved = disputes.filter((d) => d.status !== "OPEN");
  const active = disputes.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Khiếu nại" subtitle="Buyer hoặc seller mở khiếu nại trên đơn hàng đang ký quỹ — bấm vào 1 dòng để xem chi tiết và quyết định." />

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          {loading ? "Đang tải..." : `Khiếu nại đang chờ xử lý (${openDisputes.length})`}
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
        ) : openDisputes.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Không có khiếu nại nào đang chờ xử lý" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {openDisputes.map((d) => (
              <button
                key={d.id}
                onClick={() => openDispute(d.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition hover:border-[var(--adm-brand)]/50"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-[var(--adm-text)]">
                    {d.orderItem.productName}
                    {d.phase === "POST_RELEASE_WARRANTY" && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--adm-warn-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--adm-warn)]">
                        <Shield className="h-2.5 w-2.5" /> Sau giải ngân
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[var(--adm-muted)]">
                    Người bán: {d.orderItem.product?.seller.shopName ?? "—"} · Mở bởi{" "}
                    {d.openedBy.name ?? d.openedBy.username ?? d.openedBy.email} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <span className="shrink-0 text-base font-black text-[var(--adm-danger)]">
                  {formatVndDemo(d.orderItem.price * d.orderItem.quantity)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Đã xử lý</h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
            {resolved.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0">
                <span className="truncate text-[var(--adm-text)]">{d.orderItem.productName}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${RESOLVED_LABEL[d.status]!.className}`}>
                  {RESOLVED_LABEL[d.status]!.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeModal}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[var(--adm-text)]">{active.orderItem.productName}</h3>
                  {active.phase === "POST_RELEASE_WARRANTY" && (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--adm-warn-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--adm-warn)]">
                      <Shield className="h-3 w-3" /> Bảo hành sau giải ngân
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">Người bán: {active.orderItem.product?.seller.shopName ?? "—"}</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-1 text-[var(--adm-muted)] hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Lý do khiếu nại</p>
                <p className="mt-1 text-[var(--adm-text)]">{active.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Mở bởi</p>
                  <p className="mt-1 truncate text-[var(--adm-text)]">
                    {active.openedBy.name ?? active.openedBy.username ?? active.openedBy.email}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--adm-surface-2)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Số tiền</p>
                  <p className="mt-1 font-black tabular-nums text-[var(--adm-brand)]">
                    {formatVndDemo(active.orderItem.price * active.orderItem.quantity)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--adm-muted)]">Mở lúc {new Date(active.createdAt).toLocaleString("vi-VN")}</p>
            </div>

            {/* Nội dung đã giao — ẩn mặc định, tải theo yêu cầu qua endpoint
                riêng có ghi audit (SECURITY_AUDIT #7). KHÔNG đi kèm danh sách. */}
            <div className="mt-4 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Nội dung đã giao</p>
                {delivered === null && (
                  <button
                    onClick={() => viewDelivered(active.id)}
                    disabled={deliveredLoading}
                    className="flex items-center gap-1 rounded-full border border-[var(--adm-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--adm-text)] transition hover:border-[var(--adm-brand)] disabled:opacity-50"
                  >
                    <Eye className="h-3 w-3" /> {deliveredLoading ? "Đang tải..." : "Xem (ghi nhật ký)"}
                  </button>
                )}
              </div>
              {delivered === null ? (
                <p className="mt-1 text-[11px] text-[var(--adm-muted)]">
                  Ẩn mặc định. Mỗi lần bấm xem đều được ghi vào Nhật ký hoạt động (ai/đơn nào/lúc nào).
                </p>
              ) : deliveredEmpty ? (
                <p className="mt-1 text-xs text-[var(--adm-muted)]">
                  Đơn này không có nội dung giao tự động (kho thật) — có thể là sản phẩm giao thủ công.
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-1.5">
                  {delivered.map((line, i) => (
                    <code key={i} className="block break-all rounded bg-[var(--adm-surface)] px-2 py-1 text-[11px] text-[var(--adm-text)]">
                      {line}
                    </code>
                  ))}
                </div>
              )}
            </div>

            {active.phase === "PLATFORM" && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="danger" disabled={busyId === active.id} onClick={() => handleAction(active.id, "refund_buyer")}>
                  <X className="h-3.5 w-3.5" /> Hoàn toàn bộ
                </Button>
                <Button variant="primary" disabled={busyId === active.id} onClick={() => setShowPartial((v) => !v)}>
                  <Scale className="h-3.5 w-3.5" /> Hoàn một phần
                </Button>
                <Button variant="success" disabled={busyId === active.id} onClick={() => handleAction(active.id, "release_seller")}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Từ chối · giải ngân seller
                </Button>
              </div>
            )}

            {active.phase === "POST_RELEASE_WARRANTY" &&
              (() => {
                const lineTotal = active.orderItem.price * active.orderItem.quantity;
                const insuranceBalance = active.orderItem.product?.seller.insuranceBalance ?? 0;
                const cap = Math.min(lineTotal, insuranceBalance);
                const value = Number(insuranceAmount);
                const valid = Number.isInteger(value) && value >= 1 && value <= cap;
                return (
                  <div className="mt-5 flex flex-col gap-3">
                    <div className="rounded-xl border border-[var(--adm-warn)]/30 bg-[var(--adm-warn-bg)] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-warn)]">
                        Đơn đã giải ngân — quỹ bảo hiểm người bán
                      </p>
                      <p className="mt-1 text-sm text-[var(--adm-text)]">
                        Số dư hiện có: <b className="tabular-nums">{formatVndDemo(insuranceBalance)}</b>
                        {insuranceBalance < lineTotal && (
                          <span className="ml-1.5 text-[var(--adm-danger)]">
                            (không đủ để đền 100% giá trị đơn — {formatVndDemo(lineTotal)})
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                        Số tiền đền bù (tối đa {formatVndDemo(cap)})
                      </label>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={cap}
                          value={insuranceAmount}
                          onChange={(e) => setInsuranceAmount(e.target.value)}
                          placeholder={`VD: ${cap}`}
                          className="w-40 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2.5 py-1.5 text-sm text-[var(--adm-text)] focus:border-[var(--adm-brand)] focus:outline-none"
                        />
                        <span className="text-sm text-[var(--adm-muted)]">đ</span>
                        <Button
                          variant="danger"
                          disabled={!valid || cap < 1 || busyId === active.id}
                          onClick={submitInsuranceRefund}
                        >
                          <Shield className="h-3.5 w-3.5" /> Đền từ quỹ bảo hiểm
                        </Button>
                        <Button
                          variant="success"
                          disabled={busyId === active.id}
                          onClick={() => handleAction(active.id, "reject_claim")}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Từ chối khiếu nại
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {showPartial &&
              (() => {
                const lineTotal = active.orderItem.price * active.orderItem.quantity;
                const pct = Number(partialPct);
                const valid = Number.isInteger(pct) && pct >= 1 && pct <= 99;
                const buyerRefund = valid ? Math.round((lineTotal * pct) / 100) : 0;
                const sellerKept = lineTotal - buyerRefund;
                return (
                  <div className="mt-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Tỉ lệ hoàn cho người mua (1–99%)</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={partialPct}
                        onChange={(e) => setPartialPct(e.target.value)}
                        placeholder="VD: 30"
                        className="w-24 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2.5 py-1.5 text-sm text-[var(--adm-text)] focus:border-[var(--adm-brand)] focus:outline-none"
                      />
                      <span className="text-sm text-[var(--adm-muted)]">%</span>
                      <Button variant="primary" disabled={!valid || busyId === active.id} onClick={submitPartial}>
                        Xác nhận hoàn {valid ? `${pct}%` : ""}
                      </Button>
                    </div>
                    {valid && (
                      <p className="mt-2 text-[11px] text-[var(--adm-muted)]">
                        Người mua nhận lại <b className="text-[var(--adm-text)]">{formatVndDemo(buyerRefund)}</b> · người bán giữ{" "}
                        <b className="text-[var(--adm-text)]">{formatVndDemo(sellerKept)}</b> (trước khi trừ phí sàn theo tỉ lệ). Người
                        mua VẪN xem được nội dung đã giao.
                      </p>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
