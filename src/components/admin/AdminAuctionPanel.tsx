"use client";

// Panel THẬT "Đấu giá vị trí vàng" — xây lại 2026-08-15 theo mô hình 1 phiên/
// tuần (20:00–22:00 tối Chủ Nhật) thay cho 6 vị trí cố định cũ. Dữ liệu/hành
// vi đụng tiền seller thật: GET /api/admin/auction/sessions, GET/PATCH
// /api/admin/auction-settings, POST /api/admin/auction/close-due (chốt phiên
// bấm tay — cùng logic với cron), POST /api/admin/auction/bids/[id]/approve
// và .../reject (duyệt/từ chối từng vị trí Top N).
import { Check, Gavel, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, PageHeader, StatusBadge, TextInput, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";

type Bid = {
  id: string;
  amount: number;
  status: "ACTIVE" | "PENDING_APPROVAL" | "WON" | "LOST" | "REJECTED";
  rank: number | null;
  createdAt: string;
  decidedAt: string | null;
  sellerName: string;
  sellerSlug: string;
  productName: string;
  productSlug: string;
};

type Session = {
  id: string;
  windowStart: string;
  windowEnd: string;
  status: "OPEN" | "PENDING_REVIEW" | "CLOSED";
  slotCount: number | null;
  closedAt: string | null;
  bids: Bid[];
};

const BID_STATUS_TONE: Record<Bid["status"], "brand" | "success" | "danger" | "warn" | "neutral"> = {
  ACTIVE: "brand",
  PENDING_APPROVAL: "warn",
  WON: "success",
  LOST: "neutral",
  REJECTED: "danger",
};

const BID_STATUS_LABEL: Record<Bid["status"], string> = {
  ACTIVE: "Đang khoá",
  PENDING_APPROVAL: "Chờ duyệt",
  WON: "Đã thắng",
  LOST: "Rớt hạng (đã hoàn)",
  REJECTED: "Đã từ chối (đã hoàn)",
};

const SESSION_STATUS_LABEL: Record<Session["status"], string> = {
  OPEN: "Đang mở",
  PENDING_REVIEW: "Chờ duyệt",
  CLOSED: "Đã xong",
};

export default function AdminAuctionPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotCount, setSlotCount] = useState(6);
  const [floorPrice, setFloorPrice] = useState(50000);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);
  const [bidBusyId, setBidBusyId] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/auction/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    const res = await fetch("/api/admin/auction-settings");
    if (res.ok) {
      const data = await res.json();
      setSlotCount(data.slotCount);
      setFloorPrice(data.floorPrice);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadSessions(), loadSettings()]);
    })();
  }, []);

  const saveSettings = async () => {
    setSettingsBusy(true);
    setSettingsMsg(null);
    const res = await fetch("/api/admin/auction-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotCount, floorPrice }),
    });
    const data = await res.json();
    setSettingsBusy(false);
    setSettingsMsg(res.ok ? "Đã lưu — áp dụng cho lần chốt phiên kế tiếp." : (data.error ?? "Lưu thất bại."));
  };

  const closeDue = async () => {
    setCloseBusy(true);
    setCloseMsg(null);
    const res = await fetch("/api/admin/auction/close-due", { method: "POST" });
    const data = await res.json();
    setCloseBusy(false);
    setCloseMsg(res.ok ? `Đã chốt ${data.sessionsClosed} phiên đến hạn.` : (data.error ?? "Thất bại."));
    if (res.ok) loadSessions();
  };

  const approve = async (bidId: string) => {
    setBidBusyId(bidId);
    const res = await fetch(`/api/admin/auction/bids/${bidId}/approve`, { method: "POST" });
    setBidBusyId(null);
    if (res.ok) loadSessions();
  };

  const reject = async (bidId: string) => {
    if (!confirm("Từ chối vị trí này? Tiền đã khoá sẽ được hoàn lại cho seller.")) return;
    setBidBusyId(bidId);
    const res = await fetch(`/api/admin/auction/bids/${bidId}/reject`, { method: "POST" });
    setBidBusyId(null);
    if (res.ok) loadSessions();
  };

  const pendingCount = sessions.reduce(
    (sum, s) => sum + s.bids.filter((b) => b.status === "PENDING_APPROVAL").length,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đấu giá vị trí vàng"
        subtitle="1 phiên/tuần (20:00–22:00 tối Chủ Nhật) — Top N giá cao nhất thắng, tiền khoá ngay lúc đặt giá."
        actions={pendingCount > 0 ? <StatusBadge tone="warn" dot>{pendingCount} vị trí chờ duyệt</StatusBadge> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--adm-muted)]">Cấu hình</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Số vị trí vàng (N)">
              <TextInput type="number" value={slotCount} onChange={(e) => setSlotCount(Number(e.target.value))} min={1} max={50} />
            </Field>
            <Field label="Giá sàn (đ)">
              <TextInput type="number" value={floorPrice} onChange={(e) => setFloorPrice(Number(e.target.value))} min={0} step={1000} />
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="secondary" disabled={settingsBusy} onClick={saveSettings}>
              <Save className="h-3.5 w-3.5" /> Lưu cấu hình
            </Button>
            {settingsMsg && <span className="text-xs text-[var(--adm-muted)]">{settingsMsg}</span>}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--adm-muted)]">Chốt phiên đến hạn</p>
          <p className="mb-3 text-xs text-[var(--adm-muted)]">
            Tự động chạy mỗi ngày qua cron (23:00 giờ VN) — bấm nút này để chốt ngay khi cần (test, hoặc cron chưa kịp chạy).
            Idempotent: bấm nhiều lần không chốt trùng, không trừ/hoàn tiền 2 lần.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="primary" disabled={closeBusy} onClick={closeDue}>
              <Gavel className="h-3.5 w-3.5" /> {closeBusy ? "Đang xử lý..." : "Chốt phiên đến hạn"}
            </Button>
            {closeMsg && <span className="text-xs text-[var(--adm-muted)]">{closeMsg}</span>}
          </div>
        </Card>
      </div>

      <div>
        <p className="mb-3 text-sm font-black text-[var(--adm-text)]">
          {loading ? "Đang tải..." : `Phiên gần đây (${sessions.length})`}
        </p>
        {!loading && sessions.length === 0 ? (
          <Card><EmptyState icon={Gavel} title="Chưa có phiên đấu giá nào" /></Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[var(--adm-text)]">
                      {new Date(s.windowStart).toLocaleString("vi-VN")} → {new Date(s.windowEnd).toLocaleTimeString("vi-VN")}
                    </p>
                    <p className="text-xs text-[var(--adm-muted)]">
                      {s.slotCount ?? "?"} vị trí · {s.bids.length} lượt đặt giá
                    </p>
                  </div>
                  <StatusBadge tone={s.status === "OPEN" ? "brand" : s.status === "PENDING_REVIEW" ? "warn" : "success"}>
                    {SESSION_STATUS_LABEL[s.status]}
                  </StatusBadge>
                </div>

                {s.bids.length === 0 ? (
                  <p className="text-xs text-[var(--adm-muted)]">Chưa có lượt đặt giá nào.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {s.bids.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--adm-surface-2)] px-3 py-2 text-xs"
                      >
                        <span className="w-6 shrink-0 text-center font-black text-[var(--adm-brand)]">{b.rank ?? "—"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[var(--adm-text)]">
                            {b.productName} — <span className="text-[var(--adm-muted)]">{b.sellerName}</span>
                          </p>
                        </div>
                        <span className="shrink-0 font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(b.amount)}</span>
                        <StatusBadge tone={BID_STATUS_TONE[b.status]}>{BID_STATUS_LABEL[b.status]}</StatusBadge>
                        {b.status === "PENDING_APPROVAL" && (
                          <div className="flex shrink-0 gap-1.5">
                            <Button variant="success" disabled={bidBusyId === b.id} onClick={() => approve(b.id)}>
                              <Check className="h-3 w-3" /> Duyệt
                            </Button>
                            <Button variant="danger" disabled={bidBusyId === b.id} onClick={() => reject(b.id)}>
                              <X className="h-3 w-3" /> Từ chối
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
