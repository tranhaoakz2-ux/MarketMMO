"use client";

import { Eye, Scale, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";

type Dispute = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED_REFUND" | "RESOLVED_PARTIAL" | "RESOLVED_RELEASE";
  createdAt: string;
  openedBy: { email: string | null; username: string | null; name: string | null };
  orderItem: {
    productName: string;
    price: number;
    quantity: number;
    product: { seller: { shopName: string } } | null;
  };
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

  const resetModalExtras = () => {
    setDelivered(null);
    setDeliveredEmpty(false);
    setShowPartial(false);
    setPartialPct("");
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
    action: "refund_buyer" | "release_seller" | "partial_refund",
    refundPercent?: number
  ) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "partial_refund" ? { action, refundPercent } : { action }),
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
    handleAction(active.id, "partial_refund", pct);
  };

  const openDisputes = disputes.filter((d) => d.status === "OPEN");
  const resolved = disputes.filter((d) => d.status !== "OPEN");
  const active = disputes.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          Khiếu nại đang chờ xử lý ({openDisputes.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
        ) : openDisputes.length === 0 ? (
          <AdminEmptyState>Không có khiếu nại nào đang chờ xử lý.</AdminEmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {openDisputes.map((d) => (
              <button
                key={d.id}
                onClick={() => openDispute(d.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-left shadow-sm transition hover:border-[var(--adm-brand)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--adm-text)]">{d.orderItem.productName}</p>
                  <p className="truncate text-xs text-[var(--adm-muted)]">
                    Người bán: {d.orderItem.product?.seller.shopName ?? "—"} · Mở bởi{" "}
                    {d.openedBy.name ?? d.openedBy.username ?? d.openedBy.email} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <span className="shrink-0 text-base font-black text-[var(--adm-danger)]">
                  {formatVnd(d.orderItem.price * d.orderItem.quantity)}
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
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-[var(--adm-text)]">{d.orderItem.productName}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    d.status === "RESOLVED_REFUND"
                      ? "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
                      : d.status === "RESOLVED_PARTIAL"
                        ? "bg-[var(--adm-surface-2)] text-[var(--adm-brand)]"
                        : "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                  }`}
                >
                  {d.status === "RESOLVED_REFUND"
                    ? "Đã hoàn toàn bộ"
                    : d.status === "RESOLVED_PARTIAL"
                      ? "Đã hoàn một phần"
                      : "Đã giải ngân seller"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[var(--adm-text)]">{active.orderItem.productName}</h3>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
                  Người bán: {active.orderItem.product?.seller.shopName ?? "—"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-[var(--adm-muted)] hover:bg-white/10"
              >
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
                  <p className="mt-1 font-black text-[var(--adm-brand)]">
                    {formatVnd(active.orderItem.price * active.orderItem.quantity)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--adm-muted)]">
                Mở lúc {new Date(active.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            {/* Nội dung đã giao — ẩn mặc định, tải theo yêu cầu qua endpoint
                riêng có ghi audit (SECURITY_AUDIT #7). KHÔNG đi kèm danh sách. */}
            <div className="mt-4 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                  Nội dung đã giao
                </p>
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
                    <code
                      key={i}
                      className="block break-all rounded bg-[var(--adm-surface)] px-2 py-1 text-[11px] text-[var(--adm-text)]"
                    >
                      {line}
                    </code>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <AdminButton
                variant="danger"
                disabled={busyId === active.id}
                onClick={() => handleAction(active.id, "refund_buyer")}
              >
                <X className="h-3.5 w-3.5" /> Hoàn toàn bộ
              </AdminButton>
              <AdminButton
                variant="brand"
                disabled={busyId === active.id}
                onClick={() => setShowPartial((v) => !v)}
              >
                <Scale className="h-3.5 w-3.5" /> Hoàn một phần
              </AdminButton>
              <AdminButton
                variant="success"
                disabled={busyId === active.id}
                onClick={() => handleAction(active.id, "release_seller")}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Từ chối · giải ngân seller
              </AdminButton>
            </div>

            {showPartial && (() => {
              const lineTotal = active.orderItem.price * active.orderItem.quantity;
              const pct = Number(partialPct);
              const valid = Number.isInteger(pct) && pct >= 1 && pct <= 99;
              const buyerRefund = valid ? Math.round((lineTotal * pct) / 100) : 0;
              const sellerKept = lineTotal - buyerRefund;
              return (
                <div className="mt-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                    Tỉ lệ hoàn cho người mua (1–99%)
                  </label>
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
                    <AdminButton
                      variant="brand"
                      disabled={!valid || busyId === active.id}
                      onClick={submitPartial}
                    >
                      Xác nhận hoàn {valid ? `${pct}%` : ""}
                    </AdminButton>
                  </div>
                  {valid && (
                    <p className="mt-2 text-[11px] text-[var(--adm-muted)]">
                      Người mua nhận lại <b className="text-[var(--adm-text)]">{formatVnd(buyerRefund)}</b> ·
                      người bán giữ <b className="text-[var(--adm-text)]">{formatVnd(sellerKept)}</b> (trước khi
                      trừ phí sàn theo tỉ lệ). Người mua VẪN xem được nội dung đã giao.
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
