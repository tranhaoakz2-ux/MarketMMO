"use client";

// Panel THẬT "Hoa hồng" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoCommissions.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành
// vi vẫn THẬT (đây là thao tác đụng tiền + cấu hình nhạy cảm nhất trong khu
// admin): fetch GET /api/admin/commissions, POST
// /api/admin/commissions/disburse (chọn/tất cả), GET/PATCH
// /api/admin/commissions/settings, POST /api/admin/commissions/toggle —
// không đổi 1 dòng logic nghiệp vụ (validate %, kill switch, xác nhận
// confirm() trước khi giải ngân/tắt). API route đã có sẵn requireAdmin()
// (không đụng tới).
import { useEffect, useState } from "react";
import { Flag, Inbox, Save, Send } from "lucide-react";
import {
  Button,
  Card,
  type Column,
  DataTable,
  EmptyState,
  PageHeader,
  Segmented,
  StatusBadge,
  type Tone,
  formatVndDemo,
} from "@/components/admin-demo/AdminDemoKit";
import { commissionStatusLabel, type CommissionStatus } from "@/lib/constants";

type Row = {
  id: string;
  status: CommissionStatus;
  commissionAmount: number;
  orderAmount: number;
  percentApplied: number;
  flagged: boolean;
  flaggedReason: string | null;
  createdAt: string;
  orderId: string;
  referrer: { id: string; name: string | null; username: string | null; email: string | null };
  referredName: string;
};
type Summary = Record<string, { count: number; total: number }>;
type Setting = { commissionPercent: number; perReferrerCap: number; capPeriodDays: number; enabled: boolean };
type Hist = { id: string; by: string; oldCommissionPercent: number; newCommissionPercent: number; createdAt: string };

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ đủ điều kiện" },
  { key: "ELIGIBLE", label: "Đủ điều kiện" },
  { key: "PAID", label: "Đã giải ngân" },
  { key: "CANCELLED", label: "Đã huỷ" },
  { key: "FLAGGED", label: "Bị gắn cờ" },
];
const toneOf: Record<CommissionStatus, Tone> = {
  PENDING: "warn",
  ELIGIBLE: "info",
  PAID: "success",
  CANCELLED: "neutral",
};

export default function AdminCommissionsPanel() {
  const [tab, setTab] = useState<"list" | "settings">("list");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hoa hồng affiliate"
        subtitle="Quản lý hoa hồng giới thiệu: theo dõi theo trạng thái, chỉnh % (có ràng buộc ngưỡng margin), và giải ngân phần đủ điều kiện."
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "list", label: "Danh sách & Giải ngân" },
          { value: "settings", label: "Cài đặt %" },
        ]}
      />
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
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
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
    setMsg(res.ok ? `Đã giải ngân ${d.disbursed} khoản, tổng ${formatVndDemo(d.totalPaid)}.` : (d.error ?? "Thất bại."));
    if (res.ok) load();
  };

  const eligibleSelected = rows.filter((r) => selected.has(r.id) && r.status === "ELIGIBLE").map((r) => r.id);

  const columns: Column<Row>[] = [
    {
      key: "select",
      header: "",
      render: (r) =>
        r.status === "ELIGIBLE" ? (
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[var(--adm-brand)]" />
        ) : (
          <span />
        ),
    },
    {
      key: "referrer",
      header: "Người giới thiệu",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-bold text-[var(--adm-text)]">
            {r.referrer.name ?? r.referrer.username ?? r.referrer.email}
            {r.flagged && <Flag className="h-3 w-3 shrink-0 text-[var(--adm-danger)]" />}
          </p>
          <p className="truncate text-[11px] text-[var(--adm-muted)]">{r.percentApplied}% · {formatVndDemo(r.orderAmount)}</p>
          {r.flagged && r.flaggedReason && <p className="truncate text-[10.5px] text-[var(--adm-danger)]">{r.flaggedReason}</p>}
        </div>
      ),
    },
    {
      key: "referred",
      header: "Người được mời / Đơn",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[var(--adm-text)]">{r.referredName}</p>
          <p className="truncate text-[11px] text-[var(--adm-muted)]">#{r.orderId.slice(-8)}</p>
        </div>
      ),
    },
    { key: "amount", header: "Hoa hồng", align: "right", render: (r) => <span className="font-bold tabular-nums text-[var(--adm-brand)]">{formatVndDemo(r.commissionAmount)}</span> },
    { key: "status", header: "Trạng thái", render: (r) => <StatusBadge tone={toneOf[r.status]} dot>{commissionStatusLabel[r.status]}</StatusBadge> },
    { key: "time", header: "Thời gian", render: (r) => <span className="text-xs text-[var(--adm-muted)]">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["PENDING", "ELIGIBLE", "PAID", "CANCELLED", "FLAGGED"] as const).map((k) => (
          <Card key={k} padding="p-3">
            <p className="text-[11px] font-semibold text-[var(--adm-muted)]">
              {k === "FLAGGED" ? "Bị gắn cờ" : commissionStatusLabel[k as CommissionStatus]}
            </p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-[var(--adm-text)]">{formatVndDemo(summary[k]?.total ?? 0)}</p>
            <p className="text-[11px] text-[var(--adm-muted)]">{summary[k]?.count ?? 0} khoản</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              status === f.key
                ? "border-[var(--adm-brand)] bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
                : "border-[var(--adm-border)] text-[var(--adm-muted)] hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={referrer}
          onChange={(e) => setReferrer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Lọc theo referrerId..."
          className="ml-auto rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-xs text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)] sm:w-56"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={busy || eligibleSelected.length === 0}
          onClick={() => disburse({ ids: eligibleSelected }, `giải ngân ${eligibleSelected.length} khoản đã chọn`)}
        >
          <Send className="h-3.5 w-3.5" /> Giải ngân đã chọn ({eligibleSelected.length})
        </Button>
        <Button variant="success" disabled={busy} onClick={() => disburse({ all: true }, "giải ngân TẤT CẢ khoản đủ điều kiện")}>
          <Send className="h-3.5 w-3.5" /> Giải ngân tất cả đủ điều kiện
        </Button>
        {msg && <span className="text-xs font-semibold text-[var(--adm-muted)]">{msg}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          empty={<EmptyState icon={Inbox} title="Không có khoản hoa hồng nào khớp bộ lọc" />}
        />
      )}
    </div>
  );
}

function SettingsTab() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [feeDefault, setFeeDefault] = useState(0);
  const [maxCommission, setMaxCommission] = useState(0);
  const [history, setHistory] = useState<Hist[]>([]);
  const [commission, setCommission] = useState("");
  const [cap, setCap] = useState("");
  const [period, setPeriod] = useState("");
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/commissions/settings");
    if (res.ok) {
      const d = await res.json();
      setSetting(d.setting);
      setFeeDefault(d.platformFeeDefault);
      setMaxCommission(d.maxCommissionPercent);
      setHistory(d.history);
      setCommission(String(d.setting.commissionPercent));
      setCap(String(d.setting.perReferrerCap));
      setPeriod(String(d.setting.capPeriodDays));
    }
  };
  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/commissions/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commissionPercent: Number(commission),
        perReferrerCap: Number(cap),
        capPeriodDays: Number(period),
      }),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Đã lưu cấu hình." } : { ok: false, text: d.error ?? "Lưu thất bại." });
    if (res.ok) load();
  };

  const toggleEnabled = async () => {
    if (!setting) return;
    const next = !setting.enabled;
    if (
      !next &&
      !confirm(
        "Tắt hoa hồng giới thiệu? Hoa hồng MỚI sẽ ngừng phát sinh từ giờ. Hoa hồng đã ghi nhận trước đó KHÔNG bị huỷ và vẫn được giải ngân bình thường."
      )
    )
      return;
    setToggling(true);
    const res = await fetch("/api/admin/commissions/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setToggling(false);
    if (res.ok) load();
  };

  if (!setting) return <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-[var(--adm-text)]">Tính năng hoa hồng giới thiệu</h3>
            <StatusBadge tone={setting.enabled ? "success" : "neutral"}>{setting.enabled ? "ĐANG BẬT" : "ĐÃ TẮT"}</StatusBadge>
          </div>
          <p className="mt-1 max-w-xl text-[11px] text-[var(--adm-muted)]">
            Tắt sẽ ngừng phát sinh hoa hồng MỚI kể từ thời điểm tắt. Hoa hồng đã ghi nhận (đủ điều kiện/đã giải ngân)
            KHÔNG bị huỷ và vẫn hiển thị + giải ngân bình thường. Bật lại chỉ áp dụng cho hoa hồng phát sinh sau đó.
          </p>
        </div>
        <Button variant={setting.enabled ? "danger" : "primary"} disabled={toggling} onClick={toggleEnabled}>
          {setting.enabled ? "Tắt hoa hồng" : "Bật hoa hồng"}
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <h3 className="mb-1 text-sm font-black text-[var(--adm-text)]">Cấu hình %</h3>
          <p className="mb-3 text-[11px] text-[var(--adm-muted)]">
            Ràng buộc: % hoa hồng phải NHỎ HƠN phí sàn / 2 = <b className="text-[var(--adm-text)]">{maxCommission}%</b> (phí sàn hiện tại{" "}
            {feeDefault}%). % mới chỉ áp dụng cho hoa hồng phát sinh sau, không hồi tố.
          </p>
          <label className="mb-1 block text-xs font-semibold text-[var(--adm-muted)]">% hoa hồng</label>
          <input
            type="number"
            step="0.1"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="mb-3 w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none"
          />
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
            <Button variant="primary" disabled={busy} onClick={save}>
              <Save className="h-3.5 w-3.5" /> Lưu cấu hình
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử đổi %</h3>
          {history.length === 0 ? (
            <p className="text-xs text-[var(--adm-muted)]">Chưa có thay đổi nào.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg bg-[var(--adm-surface-2)] px-3 py-2 text-xs">
                  <p className="text-[var(--adm-text)]">
                    Hoa hồng {h.oldCommissionPercent}% → <b>{h.newCommissionPercent}%</b>
                  </p>
                  <p className="text-[11px] text-[var(--adm-muted)]">{h.by} · {new Date(h.createdAt).toLocaleString("vi-VN")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
