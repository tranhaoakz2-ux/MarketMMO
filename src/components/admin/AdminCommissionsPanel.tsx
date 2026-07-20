"use client";

import { useEffect, useState } from "react";
import { Flag, Save, Send } from "lucide-react";
import { AdminBadge, AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";
import { commissionStatusLabel, type CommissionStatus } from "@/lib/constants";

type Row = {
  id: string;
  status: CommissionStatus;
  commissionAmount: number;
  orderAmount: number;
  percentApplied: number;
  flagged: boolean;
  flaggedReason: string | null;
  eligibleAt: string | null;
  paidAt: string | null;
  createdAt: string;
  orderId: string;
  referrer: { id: string; name: string | null; username: string | null; email: string | null };
  referredName: string;
};
type Summary = Record<string, { count: number; total: number }>;
type Setting = { commissionPercent: number; platformMarginPercent: number; perReferrerCap: number; capPeriodDays: number };
type Hist = { id: string; by: string; oldCommissionPercent: number; newCommissionPercent: number; oldMarginPercent: number; newMarginPercent: number; createdAt: string };

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ đủ điều kiện" },
  { key: "ELIGIBLE", label: "Đủ điều kiện" },
  { key: "PAID", label: "Đã giải ngân" },
  { key: "CANCELLED", label: "Đã huỷ" },
  { key: "FLAGGED", label: "Bị gắn cờ" },
];
const badgeOf: Record<CommissionStatus, "warn" | "info" | "success" | "neutral"> = {
  PENDING: "warn",
  ELIGIBLE: "info",
  PAID: "success",
  CANCELLED: "neutral",
};

export default function AdminCommissionsPanel() {
  const [tab, setTab] = useState<"list" | "settings">("list");
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("list")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === "list" ? "bg-[var(--adm-brand)] text-[#14141f]" : "bg-[var(--adm-surface-2)] text-[var(--adm-muted)]"}`}
        >
          Danh sách & Giải ngân
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === "settings" ? "bg-[var(--adm-brand)] text-[#14141f]" : "bg-[var(--adm-surface-2)] text-[var(--adm-muted)]"}`}
        >
          Cài đặt %
        </button>
      </div>
      {tab === "list" ? <ListTab /> : <SettingsTab />}
    </div>
  );
}

function ListTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [status, setStatus] = useState("ALL");
  const [referrer, setReferrer] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status !== "ALL") qs.set("status", status);
    if (referrer.trim()) qs.set("referrerId", referrer.trim());
    const res = await fetch(`/api/admin/commissions?${qs}`);
    if (res.ok) {
      const d = await res.json();
      setRows(d.commissions);
      setSummary(d.summary);
    }
    setSelected(new Set());
    setLoading(false);
  };
  useEffect(() => {
    (async () => { await load(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const disburse = async (payload: object, label: string) => {
    if (!confirm(`Xác nhận ${label}? Tiền sẽ được cộng vào ví người giới thiệu.`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/commissions/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Đã giải ngân ${d.disbursed} khoản, tổng ${formatVnd(d.totalPaid)}.` : (d.error ?? "Thất bại."));
    if (res.ok) load();
  };

  const eligibleSelected = rows.filter((r) => selected.has(r.id) && r.status === "ELIGIBLE").map((r) => r.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["PENDING", "ELIGIBLE", "PAID", "CANCELLED", "FLAGGED"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-3">
            <p className="text-[11px] font-semibold text-[var(--adm-muted)]">
              {k === "FLAGGED" ? "Bị gắn cờ" : commissionStatusLabel[k as CommissionStatus]}
            </p>
            <p className="mt-0.5 text-sm font-black text-[var(--adm-text)]">{formatVnd(summary[k]?.total ?? 0)}</p>
            <p className="text-[11px] text-[var(--adm-muted)]">{summary[k]?.count ?? 0} khoản</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === f.key ? "border-[var(--adm-brand)] bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]" : "border-[var(--adm-border)] text-[var(--adm-muted)] hover:bg-white/5"}`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={referrer}
          onChange={(e) => setReferrer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Lọc theo referrerId..."
          className="ml-auto rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3 py-1.5 text-xs text-[var(--adm-text)] outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton variant="brand" disabled={busy || eligibleSelected.length === 0} onClick={() => disburse({ ids: eligibleSelected }, `giải ngân ${eligibleSelected.length} khoản đã chọn`)}>
          <Send className="h-3.5 w-3.5" /> Giải ngân đã chọn ({eligibleSelected.length})
        </AdminButton>
        <AdminButton variant="success" disabled={busy} onClick={() => disburse({ all: true }, "giải ngân TẤT CẢ khoản đủ điều kiện")}>
          <Send className="h-3.5 w-3.5" /> Giải ngân tất cả đủ điều kiện
        </AdminButton>
        {msg && <span className="text-xs font-semibold text-[var(--adm-muted)]">{msg}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : rows.length === 0 ? (
        <AdminEmptyState>Không có khoản hoa hồng nào khớp bộ lọc.</AdminEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <div className="grid grid-cols-[30px_1fr_1fr_110px_110px_130px] gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
            <span></span>
            <span>Người giới thiệu</span>
            <span>Người được mời / Đơn</span>
            <span>Hoa hồng</span>
            <span>Trạng thái</span>
            <span>Thời gian</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[30px_1fr_1fr_110px_110px_130px] items-center gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0">
              <input
                type="checkbox"
                disabled={r.status !== "ELIGIBLE"}
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
              />
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--adm-text)]">
                  {r.referrer.name ?? r.referrer.username ?? r.referrer.email}
                  {r.flagged && <Flag className="ml-1 inline h-3 w-3 text-[var(--adm-danger)]" />}
                </p>
                <p className="truncate text-[11px] text-[var(--adm-muted)]">{r.percentApplied}% · {formatVnd(r.orderAmount)}</p>
                {r.flagged && r.flaggedReason && <p className="truncate text-[10.5px] text-[var(--adm-danger)]">{r.flaggedReason}</p>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[var(--adm-text)]">{r.referredName}</p>
                <p className="truncate text-[11px] text-[var(--adm-muted)]">#{r.orderId.slice(-8)}</p>
              </div>
              <span className="font-bold text-[var(--adm-brand)]">{formatVnd(r.commissionAmount)}</span>
              <AdminBadge variant={badgeOf[r.status]}>{commissionStatusLabel[r.status]}</AdminBadge>
              <span className="text-[11px] text-[var(--adm-muted)]">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);
  const [commission, setCommission] = useState("");
  const [margin, setMargin] = useState("");
  const [cap, setCap] = useState("");
  const [period, setPeriod] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/commissions/settings");
    if (res.ok) {
      const d = await res.json();
      setSetting(d.setting);
      setHistory(d.history);
      setCommission(String(d.setting.commissionPercent));
      setMargin(String(d.setting.platformMarginPercent));
      setCap(String(d.setting.perReferrerCap));
      setPeriod(String(d.setting.capPeriodDays));
    }
  };
  useEffect(() => {
    (async () => { await load(); })();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/commissions/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commissionPercent: Number(commission),
        platformMarginPercent: Number(margin),
        perReferrerCap: Number(cap),
        capPeriodDays: Number(period),
      }),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Đã lưu cấu hình." } : { ok: false, text: d.error ?? "Lưu thất bại." });
    if (res.ok) load();
  };

  if (!setting) return <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
      <AdminCard>
        <h3 className="mb-1 text-sm font-black text-[var(--adm-text)]">Cấu hình %</h3>
        <p className="mb-3 text-[11px] text-[var(--adm-muted)]">
          Ràng buộc: % hoa hồng phải NHỎ HƠN ngưỡng margin. % mới chỉ áp dụng cho hoa hồng phát sinh sau, không hồi tố.
        </p>
        <label className="mb-1 block text-xs font-semibold text-[var(--adm-muted)]">% hoa hồng</label>
        <input type="number" step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none" />
        <label className="mb-1 block text-xs font-semibold text-[var(--adm-muted)]">Ngưỡng margin sàn (%) — trần cho % hoa hồng</label>
        <input type="number" step="0.1" value={margin} onChange={(e) => setMargin(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-muted)]">Trần/kỳ (đ, 0=∞)</label>
            <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-muted)]">Kỳ (ngày)</label>
            <input type="number" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none" />
          </div>
        </div>
        {msg && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-[var(--adm-success-bg)] text-[var(--adm-success)]" : "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"}`}>
            {msg.text}
          </p>
        )}
        <div className="mt-4">
          <AdminButton variant="brand" disabled={busy} onClick={save}>
            <Save className="h-3.5 w-3.5" /> Lưu cấu hình
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        <h3 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử đổi %</h3>
        {history.length === 0 ? (
          <p className="text-xs text-[var(--adm-muted)]">Chưa có thay đổi nào.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg bg-[var(--adm-surface-2)] px-3 py-2 text-xs">
                <p className="text-[var(--adm-text)]">
                  Hoa hồng {h.oldCommissionPercent}% → <b>{h.newCommissionPercent}%</b> · margin {h.oldMarginPercent}% → <b>{h.newMarginPercent}%</b>
                </p>
                <p className="text-[11px] text-[var(--adm-muted)]">{h.by} · {new Date(h.createdAt).toLocaleString("vi-VN")}</p>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
