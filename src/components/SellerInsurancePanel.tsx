"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { INSURANCE_FUND_TARGET, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Deposit = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  createdAt: string;
};

const quickAmounts = [50000, 100000, 200000, 300000];

export default function SellerInsurancePanel({
  walletBalance,
  insuranceBalance,
}: {
  walletBalance: number;
  insuranceBalance: number;
}) {
  const [amount, setAmount] = useState<number | null>(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balance, setBalance] = useState(walletBalance);
  const [insurance, setInsurance] = useState(insuranceBalance);

  const loadDeposits = async () => {
    const res = await fetch("/api/seller/insurance-deposit");
    if (res.ok) {
      const data = await res.json();
      setDeposits(data.deposits);
    }
  };

  useEffect(() => {
    (async () => {
      await loadDeposits();
    })();
  }, []);

  const handleSubmit = async () => {
    if (!amount || amount < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/seller/insurance-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể nạp quỹ bảo hiểm.");
      return;
    }
    setMessage("Đã nạp quỹ bảo hiểm thành công.");
    setBalance((b) => b - amount);
    setInsurance((i) => i + amount);
    loadDeposits();
  };

  const progress = Math.min(100, Math.round((insurance / INSURANCE_FUND_TARGET) * 100));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-black text-foreground">
          <ShieldCheck className="h-5 w-5 text-brand-dark" /> Quỹ bảo hiểm
        </h1>
        <p className="mt-1 text-xs text-muted">
          Quỹ bảo hiểm <strong>không bắt buộc</strong> — chỉ là tín hiệu tin cậy hiển thị cho
          người mua trên trang chi tiết sản phẩm, giúp gian hàng của bạn uy tín hơn.
        </p>

        <div className="mt-4 rounded-xl border border-border-c bg-surface-alt p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">
              {formatVnd(insurance)} / {formatVnd(INSURANCE_FUND_TARGET)}
            </span>
            <span className="text-xs text-muted">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border-c">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted">
          Số dư ví khả dụng: <span className="font-bold text-foreground">{formatVnd(balance)}</span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                amount === value
                  ? "border-brand-dark bg-brand text-ink"
                  : "border-border-c bg-surface text-ink hover:bg-surface-alt"
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
            min={10000}
            step={10000}
            value={amount ?? ""}
            onChange={(e) => setAmount(Number(e.target.value) || null)}
            placeholder="Nhập số tiền (VNĐ)"
            className="w-full rounded-lg border border-border-c px-3 py-2.5 text-sm focus:border-brand-dark focus:outline-none"
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
            "Nạp quỹ bảo hiểm"
          )}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Lịch sử nạp quỹ</h2>
        <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
          <div className="grid grid-cols-3 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
            <span>Thời gian</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
          </div>
          {deposits.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">Bạn chưa nạp quỹ bảo hiểm lần nào.</div>
          ) : (
            deposits.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-3 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
              >
                <span className="text-muted">
                  {new Date(d.createdAt).toLocaleString("vi-VN")}
                </span>
                <span className="font-bold text-foreground">{formatVnd(Math.abs(d.amount))}</span>
                <span className="w-fit rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                  {walletTxStatusLabel[d.status]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
