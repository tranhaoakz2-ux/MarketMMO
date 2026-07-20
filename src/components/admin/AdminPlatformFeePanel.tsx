"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";

type Schedule = { id: string; feePercent: number; startAt: string; endAt: string; by: string; createdAt: string };
type Hist = { id: string; by: string; oldPercent: number; newPercent: number; createdAt: string };
type BySeller = { sellerId: string; shopName: string; slug: string | null; totalFee: number };

export default function AdminPlatformFeePanel() {
  const [defaultPct, setDefaultPct] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [history, setHistory] = useState<Hist[]>([]);
  const [dashboard, setDashboard] = useState<{ totalFee: number; releasedItems: number; bySeller: BySeller[] }>({ totalFee: 0, releasedItems: 0, bySeller: [] });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // form thêm mốc lịch phí
  const [sPct, setSPct] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [schedMsg, setSchedMsg] = useState<string | null>(null);

  const load = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(`/api/admin/platform-fee?${qs}`);
    if (res.ok) {
      const d = await res.json();
      setDefaultPct(String(d.setting.defaultFeePercent));
      setSchedules(d.schedules);
      setHistory(d.history);
      setDashboard(d.dashboard);
    }
  };
  useEffect(() => {
    (async () => { await load(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDefault = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/platform-fee", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultFeePercent: Number(defaultPct) }),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Đã lưu % phí sàn mặc định." } : { ok: false, text: d.error ?? "Lưu thất bại." });
    if (res.ok) load();
  };

  const addSchedule = async () => {
    setSchedMsg(null);
    const res = await fetch("/api/admin/platform-fee/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feePercent: Number(sPct), startAt: sStart, endAt: sEnd }),
    });
    const d = await res.json();
    if (res.ok) { setSPct(""); setSStart(""); setSEnd(""); load(); }
    else setSchedMsg(d.error ?? "Thêm mốc thất bại.");
  };

  const delSchedule = async (id: string) => {
    if (!confirm("Xoá mốc lịch phí này?")) return;
    await fetch(`/api/admin/platform-fee/schedules/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dashboard tổng phí */}
      <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-[var(--adm-text)]">Tổng phí sàn thu được</h3>
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none" />
            <span className="text-[var(--adm-muted)]">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none" />
            <AdminButton variant="neutral" onClick={load}>Lọc</AdminButton>
          </div>
        </div>
        <p className="text-2xl font-black text-[var(--adm-brand)]">{formatVnd(dashboard.totalFee)}</p>
        <p className="text-[11px] text-[var(--adm-muted)]">từ {dashboard.releasedItems} mục đơn đã giải ngân {from || to ? "(trong kỳ)" : "(toàn thời gian)"}</p>
        {dashboard.bySeller.length > 0 && (
          <div className="mt-3 border-t border-[var(--adm-border)] pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Theo seller</p>
            <div className="flex flex-col gap-1">
              {dashboard.bySeller.map((s) => (
                <div key={s.sellerId} className="flex items-center justify-between text-xs">
                  <span className="truncate text-[var(--adm-text)]">{s.shopName}</span>
                  <span className="font-bold text-[var(--adm-text)]">{formatVnd(s.totalFee)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* % mặc định */}
        <AdminCard>
          <h3 className="mb-1 text-sm font-black text-[var(--adm-text)]">% phí sàn mặc định</h3>
          <p className="mb-3 text-[11px] text-[var(--adm-muted)]">
            Áp cho mọi đơn ngoài các mốc lịch phí. Đổi % KHÔNG hồi tố đơn cũ (đã freeze). Phải &gt; 2× % hoa hồng.
          </p>
          <div className="flex items-center gap-2">
            <input type="number" step="0.1" value={defaultPct} onChange={(e) => setDefaultPct(e.target.value)} className="w-32 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none" />
            <span className="text-sm text-[var(--adm-muted)]">%</span>
            <AdminButton variant="brand" disabled={busy} onClick={saveDefault}>
              <Save className="h-3.5 w-3.5" /> Lưu
            </AdminButton>
          </div>
          {msg && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-[var(--adm-success-bg)] text-[var(--adm-success)]" : "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"}`}>
              {msg.text}
            </p>
          )}

          <div className="mt-4 border-t border-[var(--adm-border)] pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">Lịch sử đổi %</p>
            {history.length === 0 ? (
              <p className="text-xs text-[var(--adm-muted)]">Chưa có thay đổi.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {history.map((h) => (
                  <div key={h.id} className="text-xs">
                    <span className="text-[var(--adm-text)]">{h.oldPercent}% → <b>{h.newPercent}%</b></span>
                    <span className="text-[11px] text-[var(--adm-muted)]"> · {h.by} · {new Date(h.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* Lịch phí theo kỳ */}
        <AdminCard>
          <h3 className="mb-1 text-sm font-black text-[var(--adm-text)]">Lịch phí theo kỳ</h3>
          <p className="mb-3 text-[11px] text-[var(--adm-muted)]">
            Trong khoảng thời gian đặt ra sẽ áp % này thay cho mặc định (vd kỳ khuyến mãi giảm phí). Các mốc KHÔNG được chồng lấn.
          </p>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">% phí</label>
              <input type="number" step="0.1" value={sPct} onChange={(e) => setSPct(e.target.value)} className="w-20 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-sm text-[var(--adm-text)] outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">Từ</label>
              <input type="datetime-local" value={sStart} onChange={(e) => setSStart(e.target.value)} className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-xs text-[var(--adm-text)] outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">Đến</label>
              <input type="datetime-local" value={sEnd} onChange={(e) => setSEnd(e.target.value)} className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-xs text-[var(--adm-text)] outline-none" />
            </div>
            <AdminButton variant="brand" onClick={addSchedule}>
              <Plus className="h-3.5 w-3.5" /> Thêm mốc
            </AdminButton>
          </div>
          {schedMsg && <p className="mb-2 rounded-lg bg-[var(--adm-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--adm-danger)]">{schedMsg}</p>}

          {schedules.length === 0 ? (
            <AdminEmptyState>Chưa có mốc lịch phí nào (đang dùng % mặc định).</AdminEmptyState>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--adm-border)]">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 border-b border-[var(--adm-border)] px-3 py-2 text-xs last:border-0">
                  <div>
                    <span className="font-bold text-[var(--adm-brand)]">{s.feePercent}%</span>
                    <span className="ml-2 text-[var(--adm-text)]">{new Date(s.startAt).toLocaleString("vi-VN")} → {new Date(s.endAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <button onClick={() => delSchedule(s.id)} className="rounded-md p-1 text-[var(--adm-danger)] hover:bg-white/5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
