"use client";

// Panel THẬT "Nạp tiền" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoDeposits.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT: fetch GET /api/admin/deposits, POST /api/admin/deposits/[id]
// {action:"approve"|"reject"} — không đổi 1 dòng logic nghiệp vụ (duyệt
// nạp tiền là thao tác đụng tiền thật). API route đã có sẵn requireAdmin()
// (không đụng tới).
import { Check, ExternalLink, Inbox, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  type Column,
  DataTable,
  EmptyState,
  Field,
  ListSkeleton,
  SearchInput,
  StatusBadge,
  TableSkeleton,
  TextInput,
  type Tone,
  formatVndDemo,
} from "@/components/admin-demo/AdminDemoKit";
import { walletMethodLabel, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Deposit = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  gatewayRef: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

type SepayUnmatched = {
  id: string;
  sepayId: string;
  gateway: string | null;
  amount: number;
  content: string | null;
  referenceCode: string | null;
  status: "UNMATCHED" | "RESOLVED" | "IGNORED";
  createdAt: string;
};

type AdminUserHit = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
};

const toneOf: Record<WalletTxStatus, Tone> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
  CANCELLED: "danger",
};

// Ô tìm + chọn user để gán 1 giao dịch SePay chưa khớp — tách component
// riêng vì có state tìm kiếm/debounce cục bộ, không cần đẩy lên panel cha.
function AssignToUserBox({ onAssign, busy }: { onAssign: (userId: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminUserHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        setResults(data.users.slice(0, 8));
      }
      if (!cancelled) setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  if (!open) {
    return (
      <Button variant="secondary" disabled={busy} onClick={() => setOpen(true)}>
        <Search className="h-3.5 w-3.5" /> Gán cho user
      </Button>
    );
  }

  return (
    <div className="w-64 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-2">
      <SearchInput value={q} onChange={setQ} placeholder="Tìm tên/email/username..." />
      <div className="mt-1.5 max-h-40 overflow-y-auto">
        {searching ? (
          <p className="px-1 py-1.5 text-xs text-[var(--adm-muted)]">Đang tìm...</p>
        ) : results.length === 0 ? (
          <p className="px-1 py-1.5 text-xs text-[var(--adm-muted)]">Không tìm thấy.</p>
        ) : (
          results.map((u) => (
            <button
              key={u.id}
              disabled={busy}
              onClick={() => onAssign(u.id)}
              className="block w-full truncate rounded px-1.5 py-1 text-left text-xs text-[var(--adm-text)] hover:bg-[var(--adm-brand-dim)] disabled:opacity-50"
            >
              {u.name ?? u.username ?? u.email}
            </button>
          ))
        )}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="mt-1 w-full rounded px-1.5 py-1 text-left text-[11px] text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
      >
        Huỷ
      </button>
    </div>
  );
}

export default function AdminDepositsPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<Record<string, string>>({});
  // Công tắc "duyệt tay nạp ngân hàng" (mặc định TẮT, xem /admin/cai-dat) —
  // đọc kèm trong GET /api/admin/deposits, KHÔNG ảnh hưởng nhánh USDT xác
  // minh thất bại (luôn hiện/luôn duyệt tay được bất kể công tắc này).
  const [bankManualApprovalEnabled, setBankManualApprovalEnabled] = useState(false);

  const [unmatched, setUnmatched] = useState<SepayUnmatched[]>([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(true);
  const [unmatchedBusyId, setUnmatchedBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/deposits");
    if (res.ok) {
      const data = await res.json();
      setDeposits(data.deposits);
      setBankManualApprovalEnabled(Boolean(data.bankManualApprovalEnabled));
    }
    setLoading(false);
  };

  const loadUnmatched = async () => {
    setUnmatchedLoading(true);
    const res = await fetch("/api/admin/sepay-unmatched");
    if (res.ok) {
      const data = await res.json();
      setUnmatched(data.transactions);
    }
    setUnmatchedLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
      await loadUnmatched();
    })();
  }, []);

  const handleUnmatchedAction = async (id: string, body: Record<string, unknown>) => {
    setUnmatchedBusyId(id);
    await fetch(`/api/admin/sepay-unmatched/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setUnmatchedBusyId(null);
    loadUnmatched();
  };

  const handleAction = async (id: string, action: "approve" | "reject", amountOverride?: number) => {
    setBusyId(id);
    await fetch(`/api/admin/deposits/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(amountOverride ? { amount: amountOverride } : {}) }),
    });
    setBusyId(null);
    load();
  };

  // Lệnh method="bank" (PENDING hoặc EXPIRED) chỉ hiện ở khu "chờ duyệt" khi
  // công tắc duyệt tay đang BẬT — khi TẮT, webhook SePay là nguồn duyệt duy
  // nhất, hàng chờ ngân hàng ẩn khỏi khu vực thao tác (rơi xuống lịch sử để
  // vẫn có dấu vết, KHÔNG có nút Duyệt/Từ chối). Lệnh method khác (vd "usdt"
  // xác minh thất bại) luôn hiện bình thường, không phụ thuộc công tắc này.
  const isActionable = (d: Deposit) => {
    if (d.method === "bank") {
      return bankManualApprovalEnabled && (d.status === "PENDING" || d.status === "EXPIRED");
    }
    return d.status === "PENDING";
  };
  const pending = deposits.filter(isActionable);
  const processed = deposits.filter((d) => !isActionable(d));

  const columns: Column<Deposit>[] = [
    {
      key: "user",
      header: "Người dùng",
      primary: true,
      render: (d) => <span className="truncate font-semibold text-[var(--adm-text)]">{d.user.name ?? d.user.username ?? d.user.email}</span>,
    },
    { key: "amount", header: "Số tiền", align: "right", render: (d) => <span className="font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(d.amount)}</span> },
    { key: "time", header: "Thời gian", render: (d) => <span className="text-xs text-[var(--adm-muted)]">{new Date(d.createdAt).toLocaleDateString("vi-VN")}</span> },
    { key: "status", header: "Trạng thái", render: (d) => <StatusBadge tone={toneOf[d.status]} dot>{walletTxStatusLabel[d.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div
          className={`mb-3 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold ${
            bankManualApprovalEnabled
              ? "border-[var(--adm-warn)]/30 bg-[var(--adm-warn)]/10 text-[var(--adm-warn)]"
              : "border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-muted)]"
          }`}
        >
          {bankManualApprovalEnabled
            ? "⚠ Duyệt tay nạp ngân hàng đang BẬT — nhớ tắt lại ở Cài đặt sau khi SePay hoạt động trở lại."
            : "Duyệt tay nạp ngân hàng đang TẮT — mọi lệnh ngân hàng chỉ cộng tiền tự động qua webhook SePay (bật ở /admin/cai-dat nếu SePay lỗi/bảo trì)."}
        </div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
          {loading ? "Đang tải..." : `Yêu cầu nạp tiền chờ duyệt (${pending.length})`}
        </h2>
        {loading ? (
          <ListSkeleton />
        ) : pending.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Không có yêu cầu nào đang chờ duyệt" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((d) => {
              // Bản ghi fallback do luồng tự động hoá USDT tạo ra khi verify
              // on-chain thất bại — amount=0 lúc tạo vì chưa biết số VNĐ
              // đúng, admin phải tự đối chiếu Tronscan rồi nhập tay.
              const isManualUsdtFallback = d.method === "usdt" && d.amount === 0;
              const isExpiredBankRow = d.method === "bank" && d.status === "EXPIRED";
              const manualValue = manualAmount[d.id] ?? "";
              const manualNum = Number(manualValue);
              const manualValid = Number.isInteger(manualNum) && manualNum > 0;
              return (
                <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--adm-text)]">{d.user.name ?? d.user.username ?? d.user.email}</p>
                    <p className="text-xs text-[var(--adm-muted)]">
                      {walletMethodLabel[d.method ?? ""] ?? d.method ?? "—"} · {new Date(d.createdAt).toLocaleString("vi-VN")}
                    </p>
                    {isExpiredBankRow && (
                      <p className="mt-1 text-xs font-semibold text-[var(--adm-warn)]">
                        ⚠ Lệnh đã quá 15 phút (EXPIRED) — chỉ duyệt được vì công tắc duyệt tay đang bật, tự xác nhận
                        đã thấy đúng số tiền về tài khoản ngân hàng trước khi bấm.
                      </p>
                    )}
                    {d.note && (
                      <p className={`mt-1 text-xs ${isManualUsdtFallback ? "font-semibold text-[var(--adm-warn)]" : "text-[var(--adm-muted)]"}`}>
                        {isManualUsdtFallback ? "⚠ " : "Ghi chú: "}
                        {d.note}
                      </p>
                    )}
                    {d.method === "usdt" && d.gatewayRef && (
                      <a
                        href={`https://tronscan.org/#/transaction/${d.gatewayRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--adm-info)] hover:underline"
                      >
                        Xem giao dịch trên Tronscan <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isManualUsdtFallback ? (
                      <div className="w-40">
                        <Field label="Số VNĐ (tự xác minh)">
                          <TextInput
                            type="number"
                            placeholder="Nhập số tiền"
                            value={manualValue}
                            onChange={(e) => setManualAmount((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          />
                        </Field>
                      </div>
                    ) : (
                      <span className="text-base font-black text-[var(--adm-brand)]">{formatVndDemo(d.amount)}</span>
                    )}
                    <Button
                      variant="success"
                      disabled={busyId === d.id || (isManualUsdtFallback && !manualValid)}
                      onClick={() => handleAction(d.id, "approve", isManualUsdtFallback ? manualNum : undefined)}
                    >
                      <Check className="h-3.5 w-3.5" /> Duyệt
                    </Button>
                    <Button variant="danger" disabled={busyId === d.id} onClick={() => handleAction(d.id, "reject")}>
                      <X className="h-3.5 w-3.5" /> Từ chối
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Lịch sử xử lý nạp tiền</h2>
        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={columns}
            rows={processed}
            rowKey={(d) => d.id}
            empty={<EmptyState icon={Inbox} title="Chưa có giao dịch nào" />}
          />
        )}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-black text-[var(--adm-text)]">
          {unmatchedLoading ? "Đang tải..." : `Giao dịch SePay chưa khớp lệnh (${unmatched.filter((u) => u.status === "UNMATCHED").length})`}
        </h2>
        <p className="mb-3 text-xs text-[var(--adm-muted)]">
          Webhook SePay báo tiền về nhưng không tìm thấy mã đơn khớp trong nội dung chuyển khoản (buyer quên ghi
          mã / gõ sai). Tự đối chiếu rồi gán cho đúng người, hoặc bỏ qua nếu không phải tiền nạp.
        </p>
        {unmatchedLoading ? (
          <ListSkeleton />
        ) : unmatched.filter((u) => u.status === "UNMATCHED").length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Không có giao dịch SePay nào chưa khớp" /></Card>
        ) : (
          <div className="flex flex-col gap-2">
            {unmatched
              .filter((u) => u.status === "UNMATCHED")
              .map((u) => (
                <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--adm-text)]">
                      {u.gateway ?? "Ngân hàng"} · sepayId {u.sepayId}
                    </p>
                    <p className="text-xs text-[var(--adm-muted)]">{new Date(u.createdAt).toLocaleString("vi-VN")}</p>
                    {u.content && <p className="mt-1 text-xs text-[var(--adm-muted)]">Nội dung: {u.content}</p>}
                    {u.referenceCode && <p className="text-xs text-[var(--adm-muted)]">Mã tham chiếu NH: {u.referenceCode}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-[var(--adm-brand)]">{formatVndDemo(u.amount)}</span>
                    <AssignToUserBox
                      busy={unmatchedBusyId === u.id}
                      onAssign={(userId) => handleUnmatchedAction(u.id, { action: "assign", userId })}
                    />
                    <Button
                      variant="danger"
                      disabled={unmatchedBusyId === u.id}
                      onClick={() => handleUnmatchedAction(u.id, { action: "ignore" })}
                    >
                      <X className="h-3.5 w-3.5" /> Bỏ qua
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
