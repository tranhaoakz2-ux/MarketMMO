"use client";

import { Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  note: string | null;
  createdAt: string;
};

const quickAmounts = [100000, 200000, 500000, 1000000];

const statusStyle: Record<WalletTxStatus, string> = {
  PENDING: "bg-brand-light text-brand-dark",
  CONFIRMED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

export default function SellerWithdrawPanel({ walletBalance }: { walletBalance: number }) {
  const [amount, setAmount] = useState<number | null>(100000);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(walletBalance);

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

  const handleSubmit = async () => {
    if (!amount || amount < 50000) {
      setError("Số tiền rút tối thiểu là 50.000đ.");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin ngân hàng nhận tiền.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/seller/withdraw-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể tạo yêu cầu rút tiền.");
      return;
    }
    setMessage("Đã gửi yêu cầu rút tiền — số tiền đã được khoá khỏi ví, chờ admin xử lý.");
    setBalance((b) => b - amount);
    loadWithdrawals();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-black text-foreground">
          <Wallet className="h-5 w-5 text-brand-dark" /> Rút tiền
        </h1>
        <p className="mt-1 text-xs text-muted">
          Số dư ví khả dụng: <span className="font-bold text-foreground">{formatVnd(balance)}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                amount === value
                  ? "border-brand-dark bg-brand text-ink"
                  : "border-border-c bg-surface text-foreground hover:bg-surface-alt"
              }`}
            >
              {formatVnd(value)}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Hoặc nhập số tiền khác
          </label>
          <input
            type="number"
            min={50000}
            step={10000}
            value={amount ?? ""}
            onChange={(e) => setAmount(Number(e.target.value) || null)}
            placeholder="Nhập số tiền (VNĐ)"
            className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/20 p-3">
          <p className="text-xs font-bold text-foreground">Thông tin ngân hàng nhận tiền</p>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Tên ngân hàng (vd: Vietcombank)"
            className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Số tài khoản"
            className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="Chủ tài khoản"
            className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            {message}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-full bg-brand py-3 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...
            </span>
          ) : (
            "Gửi yêu cầu rút tiền"
          )}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Lịch sử rút tiền</h2>
        <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
          <div className="grid grid-cols-3 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
            <span>Thời gian</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
          </div>
          {withdrawals.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              Bạn chưa có yêu cầu rút tiền nào.
            </div>
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-3 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
              >
                <span className="text-muted">
                  {new Date(w.createdAt).toLocaleString("vi-VN")}
                </span>
                <span className="font-bold text-foreground">{formatVnd(Math.abs(w.amount))}</span>
                <span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[w.status]}`}
                  >
                    {walletTxStatusLabel[w.status]}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
