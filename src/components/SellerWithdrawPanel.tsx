"use client";

import { Banknote, Clock, DollarSign, Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd, formatWithdrawRecipient } from "@/lib/format";
import { walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TextInput,
  Tone,
} from "@/components/seller-demo/DemoKit";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  recipientInfo: string | null;
  createdAt: string;
  withdrawAddress: string | null;
  usdtAmount: number | null;
  exchangeRate: number | null;
  rateSource: string | null;
  gatewayRef: string | null;
};

const QUICK = [100000, 200000, 500000, 1000000];
const MIN_BANK = 50000;
const MIN_USDT = 300000;

const STATUS_TONE: Record<WalletTxStatus, Tone> = {
  PENDING: "warn",
  CONFIRMED: "success",
  REJECTED: "danger",
  // EXPIRED chỉ thực sự xảy ra cho nạp ngân hàng, không bao giờ ở rút tiền —
  // có mặt thuần để thoả kiểu dùng chung WalletTxStatus.
  EXPIRED: "danger",
};

const METHOD_OPTIONS = [
  { value: "bank" as const, label: "Ngân hàng" },
  { value: "usdt_trc20" as const, label: "USDT (TRC20)" },
];

export default function SellerWithdrawPanel({ walletBalance }: { walletBalance: number }) {
  const [method, setMethod] = useState<"bank" | "usdt_trc20">("bank");
  const [amount, setAmount] = useState<number | null>(100000);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(walletBalance);

  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const loadWithdrawals = async () => {
    const res = await fetch("/api/seller/withdraw-request");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
    }
  };

  useEffect(() => {
    (async () => {
      await loadWithdrawals();
    })();
  }, []);

  // Xem trước tỷ giá real-time khi chuyển sang tab USDT — CHỈ hiển thị, tỷ
  // giá THẬT tính tiền được server tự lấy lại độc lập lúc submit (xem
  // POST /api/seller/withdraw-request).
  useEffect(() => {
    if (method !== "usdt_trc20") return;
    let cancelled = false;
    const loadRate = async () => {
      setRateLoading(true);
      setRateError(null);
      try {
        const res = await fetch("/api/seller/usdt-rate");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setRateError(data.error ?? "Không thể lấy tỷ giá.");
          setRate(null);
        } else {
          setRate(data.rate);
        }
      } catch {
        if (!cancelled) setRateError("Không thể lấy tỷ giá.");
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    };
    loadRate();
    return () => {
      cancelled = true;
    };
  }, [method]);

  const usdtPreview = rate && amount ? Math.floor((amount / rate) * 100) / 100 : null;

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (method === "bank") {
      if (!amount || amount < MIN_BANK) {
        setError(`Số tiền rút tối thiểu là ${formatVnd(MIN_BANK)}.`);
        return;
      }
      if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
        setError("Vui lòng nhập đầy đủ thông tin ngân hàng nhận tiền.");
        return;
      }
    } else {
      if (!amount || amount < MIN_USDT) {
        setError(`Số tiền rút USDT tối thiểu là ${formatVnd(MIN_USDT)}.`);
        return;
      }
      if (!withdrawAddress.trim()) {
        setError("Vui lòng nhập địa chỉ ví USDT (TRC20) nhận tiền.");
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/seller/withdraw-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        method === "bank"
          ? { method: "bank", amount, bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim() }
          : { method: "usdt_trc20", amount, withdrawAddress: withdrawAddress.trim() }
      ),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể tạo yêu cầu rút tiền.");
      return;
    }
    setMessage(
      method === "usdt_trc20"
        ? `Đã gửi yêu cầu rút ${data.usdtAmount} USDT (tỷ giá ${data.exchangeRate.toLocaleString("vi-VN")}đ/USDT, khoá tại thời điểm tạo) — chờ admin xử lý.`
        : "Đã gửi yêu cầu rút tiền — số tiền đã được khoá khỏi ví, chờ admin xử lý."
    );
    setBalance((b) => b - (amount ?? 0));
    loadWithdrawals();
  };

  const columns: Column<Withdrawal>[] = [
    {
      key: "time",
      header: "Thời gian",
      primary: true,
      render: (w) => <span className="whitespace-nowrap text-foreground">{new Date(w.createdAt).toLocaleString("vi-VN")}</span>,
    },
    {
      key: "detail",
      header: "Chi tiết",
      render: (w) =>
        w.method === "usdt_trc20" ? (
          <div className="max-w-[280px] text-muted">
            <span className="block truncate font-mono text-[11px]">{w.withdrawAddress}</span>
            {w.usdtAmount != null && (
              <span className="block text-[11px]">
                ≈ {w.usdtAmount} USDT @ {w.exchangeRate?.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
        ) : (
          <span className="block max-w-[240px] truncate text-muted">
            {formatWithdrawRecipient(w.recipientInfo, w.note)}
          </span>
        ),
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (w) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVnd(Math.abs(w.amount))}</span>,
    },
    { key: "status", header: "Trạng thái", render: (w) => <StatusBadge tone={STATUS_TONE[w.status]} dot>{walletTxStatusLabel[w.status]}</StatusBadge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rút Tiền" subtitle="Rút số dư ví về ngân hàng hoặc ví USDT (TRC20) của bạn. Admin duyệt tay." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card>
          <SectionTitle>Tạo Yêu Cầu Rút Tiền</SectionTitle>

          <div className="mb-4 grid grid-cols-2 gap-3">
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMethod(opt.value);
                  setError(null);
                  setMessage(null);
                }}
                className={`rounded-2xl border-2 px-5 py-4 text-center text-base font-black transition sm:text-lg ${
                  method === opt.value
                    ? "border-brand-dark bg-brand text-ink shadow-sm"
                    : "border-border-c bg-surface text-foreground hover:bg-surface-alt"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Chọn nhanh số tiền</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold tabular-nums transition ${
                  amount === v ? "border-brand-dark bg-brand text-ink" : "border-border-c bg-surface text-foreground hover:bg-surface-alt"
                }`}
              >
                {formatVnd(v)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hoặc nhập số tiền khác" hint={`Tối thiểu ${formatVnd(method === "usdt_trc20" ? MIN_USDT : MIN_BANK)}`}>
              <TextInput type="number" value={amount ?? ""} onChange={(e) => setAmount(Number(e.target.value) || null)} placeholder="Nhập số tiền (VNĐ)" />
            </Field>
          </div>

          {method === "bank" && (
            <div className="mt-4 rounded-xl border border-dashed border-brand-dark/30 bg-brand-light/10 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Banknote className="h-4 w-4 text-brand-dark" /> Thông tin ngân hàng nhận tiền
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Ngân hàng">
                  <TextInput value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank" />
                </Field>
                <Field label="Số tài khoản">
                  <TextInput value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Chủ tài khoản">
                    <TextInput value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="NGUYEN VAN A" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {method === "usdt_trc20" && (
            <div className="mt-4 rounded-xl border border-dashed border-brand-dark/30 bg-brand-light/10 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <DollarSign className="h-4 w-4 text-brand-dark" /> Thông tin ví USDT (TRC20) nhận tiền
              </p>
              <Field label="Địa chỉ ví TRC20" hint="Kiểm tra kỹ — chuyển sai địa chỉ không thể lấy lại.">
                <TextInput value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder="T..." />
              </Field>

              <div className="mt-3 rounded-lg bg-surface p-4">
                {rateLoading ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lấy tỷ giá...
                  </span>
                ) : rateError ? (
                  <span className="text-xs text-danger">{rateError}</span>
                ) : rate ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-base font-bold text-foreground">
                      {rate.toLocaleString("vi-VN")}đ/USDT
                    </span>
                    {usdtPreview != null && (
                      <span className="text-xl font-black text-brand-dark">
                        {formatVnd(amount ?? 0)} ≈ {usdtPreview} USDT
                      </span>
                    )}
                    <span className="text-[11px] text-muted">
                      Tỷ giá sẽ được khoá LẠI tại đúng thời điểm bạn bấm gửi yêu cầu (có thể chênh nhẹ so với số xem trước này).
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">{message}</p>}

          <div className="mt-4">
            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Đang xử lý..." : "Gửi yêu cầu rút tiền"}
            </Button>
          </div>
        </Card>

        {/* Số dư */}
        <div className="flex flex-col gap-4">
          <Card padding="p-0" className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand to-brand-dark p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70">
                <Wallet className="h-3.5 w-3.5" /> Số dư khả dụng
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-ink">{formatVnd(balance)}</p>
            </div>
            <div className="p-4 text-xs text-muted">
              Khi gửi yêu cầu, số tiền được <b className="text-foreground">khoá khỏi ví ngay</b> để tránh tiêu trùng,
              chờ admin duyệt. Bị từ chối sẽ hoàn lại đủ.
            </div>
          </Card>

          {/* Đang chờ rút — suy ra thuần phía client từ danh sách đã fetch
              (withdrawals status=PENDING), KHÔNG cần API/cột DB riêng vì số
              tiền đã bị trừ hẳn khỏi walletBalance ngay lúc tạo yêu cầu. */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                <Clock className="h-3.5 w-3.5" /> Đang chờ rút
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums text-foreground">
                {formatVnd(
                  withdrawals
                    .filter((w) => w.status === "PENDING")
                    .reduce((sum, w) => sum + Math.abs(w.amount), 0)
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {withdrawals.filter((w) => w.status === "PENDING").length} yêu cầu đang chờ admin xử lý
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Lịch sử */}
      <Card>
        <SectionTitle>Lịch Sử Rút Tiền</SectionTitle>
        <DataTable
          columns={columns}
          rows={withdrawals}
          rowKey={(w) => w.id}
          empty={<EmptyState icon={Wallet} title="Chưa có yêu cầu">Yêu cầu rút tiền của bạn sẽ hiện ở đây.</EmptyState>}
        />
      </Card>
    </div>
  );
}
