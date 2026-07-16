"use client";

import { Building2, Check, Copy, LogIn, QrCode } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import type { BankInfo, UsdtInfo } from "@/lib/payment/deposit";
import { walletMethodLabel, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

const quickAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

// Hậu tố ngẫu nhiên gắn thêm vào mã chuyển khoản (cùng với 6 ký tự cuối
// userId) để mỗi yêu cầu nạp tiền có nội dung RIÊNG BIỆT — tránh trường hợp 2
// lần nạp khác số tiền nhưng trùng nội dung, gây khó đối chiếu sao kê.
function randomCodeNonce(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

type DepositMethod = "vnpay" | "bank" | "usdt";

type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  createdAt: string;
};

const statusStyle: Record<WalletTxStatus, string> = {
  PENDING: "bg-brand-light text-brand-dark",
  CONFIRMED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-c bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
        <p className="truncate text-sm font-bold text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-border-c"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-success" /> Đã chép
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Sao chép
          </>
        )}
      </button>
    </div>
  );
}

export default function DepositPanel({
  vnpayEnabled,
  bankInfo,
  usdtInfo,
}: {
  vnpayEnabled: boolean;
  bankInfo: BankInfo | null;
  usdtInfo: UsdtInfo | null;
}) {
  const { data: session, status, update } = useSession();
  const [amount, setAmount] = useState<number | null>(100000);
  const [method, setMethod] = useState<DepositMethod>(vnpayEnabled ? "vnpay" : "bank");
  const [txid, setTxid] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [codeNonce, setCodeNonce] = useState(() => randomCodeNonce());

  const transferCode = session?.user?.id
    ? `NAP${session.user.id.slice(-6).toUpperCase()}${codeNonce}`
    : "";

  const usdtAmount = usdtInfo && amount ? amount / usdtInfo.rate : null;

  const loadTransactions = async () => {
    const res = await fetch("/api/wallet/transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
    }
  };

  useEffect(() => {
    if (session) loadTransactions();
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">Bạn cần đăng nhập để nạp tiền vào ví.</p>
        <Link
          href="/dang-nhap?callbackUrl=/nap-tien"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!amount || amount < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }
    setError(null);
    setMessage(null);

    if (method === "vnpay") {
      setLoading(true);
      const res = await fetch("/api/payment/vnpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Không thể tạo thanh toán VNPay.");
        return;
      }
      window.location.href = data.url;
      return;
    }

    if (method === "usdt") {
      if (!usdtInfo) {
        setError("Nạp tiền bằng USDT chưa được bật.");
        return;
      }
      if (!txid.trim()) {
        setError("Vui lòng nhập mã giao dịch (TxID) sau khi chuyển USDT.");
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/wallet/deposit-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        method,
        note:
          method === "usdt"
            ? `${usdtAmount?.toFixed(2)} USDT (tỷ giá ${usdtInfo!.rate.toLocaleString("vi-VN")}đ/USDT)`
            : `Nội dung CK: ${transferCode}`,
        gatewayRef: method === "usdt" ? txid.trim() : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể gửi yêu cầu nạp tiền.");
      return;
    }
    setMessage(
      method === "usdt"
        ? "Đã gửi yêu cầu nạp USDT. Admin sẽ đối chiếu giao dịch trên Tronscan và duyệt trong ít phút."
        : "Đã gửi yêu cầu nạp tiền. Vui lòng chuyển khoản đúng nội dung ở trên, admin sẽ duyệt sau khi nhận được."
    );
    setTxid("");
    loadTransactions();
    // Tạo mã mới cho lần nạp tiếp theo — tránh dùng lại đúng mã vừa gửi.
    setCodeNonce(randomCodeNonce());
  };

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-ink to-ink-soft p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-white/60">Số dư ví hiện tại</p>
          <p className="mt-1 text-3xl font-black text-brand">
            {formatVnd(session.user.walletBalance)}
          </p>
        </div>
        <button
          onClick={() => update()}
          className="w-fit rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
        >
          Làm mới số dư
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-ink">
            Chọn phương thức nạp tiền
          </h2>
          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                method === "vnpay"
                  ? "border-brand-dark bg-brand-light/40"
                  : "border-border-c hover:bg-surface-alt"
              } ${!vnpayEnabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "vnpay"}
                disabled={!vnpayEnabled}
                onChange={() => setMethod("vnpay")}
                className="accent-brand"
              />
              <QrCode className="h-5 w-5 text-ink/70" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  VNPay — tự động cộng tiền
                </p>
                <p className="text-xs text-muted">
                  {vnpayEnabled
                    ? "Chuyển hướng sang VNPay, số dư cộng ngay sau khi thanh toán"
                    : "Chưa cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET trong .env)"}
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                method === "bank"
                  ? "border-brand-dark bg-brand-light/40"
                  : "border-border-c hover:bg-surface-alt"
              }`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "bank"}
                onChange={() => setMethod("bank")}
                className="accent-brand"
              />
              <Building2 className="h-5 w-5 text-ink/70" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  Chuyển khoản ngân hàng
                </p>
                <p className="text-xs text-muted">
                  Gửi yêu cầu, admin xác nhận sau khi nhận được chuyển khoản
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                method === "usdt"
                  ? "border-brand-dark bg-brand-light/40"
                  : "border-border-c hover:bg-surface-alt"
              } ${!usdtInfo ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "usdt"}
                disabled={!usdtInfo}
                onChange={() => setMethod("usdt")}
                className="accent-brand"
              />
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                $
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">USDT (mạng TRC20)</p>
                <p className="text-xs text-muted">
                  {usdtInfo
                    ? `Quy đổi theo tỷ giá 1 USDT ≈ ${usdtInfo.rate.toLocaleString("vi-VN")}đ`
                    : "Chưa cấu hình (thiếu USDT_TRC20_ADDRESS trong .env)"}
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-ink">Số tiền nạp</h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
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
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">
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

            {method === "bank" && (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/20 p-3">
                <p className="text-xs font-bold text-ink">
                  Thông tin chuyển khoản
                </p>
                {bankInfo ? (
                  <>
                    {bankInfo.bin && (
                      <div className="flex justify-center py-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ VietQR, không phải asset tĩnh trong repo nên không dùng next/image được */}
                        <img
                          src={`https://img.vietqr.io/image/${bankInfo.bin}-${bankInfo.accountNumber}-compact2.png?amount=${amount ?? ""}&addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(bankInfo.accountHolder)}`}
                          alt="Mã QR chuyển khoản VietQR"
                          className="h-56 w-56 rounded-lg border border-border-c bg-white object-contain p-2"
                        />
                      </div>
                    )}
                    <CopyField label="Ngân hàng" value={bankInfo.bankName} />
                    <CopyField label="Số tài khoản" value={bankInfo.accountNumber} />
                    <CopyField label="Chủ tài khoản" value={bankInfo.accountHolder} />
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    Hệ thống chưa cấu hình sẵn số tài khoản — sau khi gửi yêu
                    cầu, vui lòng liên hệ admin qua Zalo/Messenger (góc dưới
                    bên phải trang) để được hướng dẫn chuyển khoản.
                  </p>
                )}
                <CopyField label="Nội dung chuyển khoản" value={transferCode} />
                <p className="text-[11px] text-muted">
                  Vui lòng chuyển đúng số tiền và ghi đúng nội dung trên để
                  yêu cầu được duyệt nhanh hơn.
                </p>
              </div>
            )}

            {method === "usdt" && usdtInfo && (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-500/5 p-3">
                <p className="text-xs font-bold text-ink">
                  Gửi USDT đến địa chỉ ví (mạng TRC20)
                </p>
                <CopyField label="Địa chỉ ví USDT-TRC20" value={usdtInfo.address} />
                <p className="text-sm font-bold text-ink">
                  Số USDT cần gửi: ≈{" "}
                  <span className="text-emerald-600">{usdtAmount?.toFixed(2)} USDT</span>
                </p>
                <p className="text-[11px] text-muted">
                  Chỉ gửi USDT trên mạng TRC20 (Tron) — gửi sai mạng có thể
                  mất tiền. Sau khi chuyển, dán mã giao dịch (TxID) bên dưới.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    Mã giao dịch (TxID)
                  </label>
                  <input
                    type="text"
                    value={txid}
                    onChange={(e) => setTxid(e.target.value)}
                    placeholder="Dán mã giao dịch từ ví/sàn của bạn"
                    className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                {message}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!amount || loading || (method === "usdt" && !usdtInfo)}
              className="rounded-full bg-brand py-3 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Đang xử lý..."
                : method === "vnpay"
                  ? `Nạp ${amount ? formatVnd(amount) : ""}`
                  : method === "usdt"
                    ? "Tôi đã gửi USDT, xác nhận yêu cầu"
                    : "Tôi đã chuyển khoản, xác nhận yêu cầu"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-ink">Lịch sử nạp tiền</h2>
        <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
          <div className="grid grid-cols-4 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
            <span>Thời gian</span>
            <span>Phương thức</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              Bạn chưa có giao dịch nạp tiền nào.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-4 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
              >
                <span className="text-muted">
                  {new Date(tx.createdAt).toLocaleString("vi-VN")}
                </span>
                <span className="text-ink">
                  {walletMethodLabel[tx.method ?? ""] ?? tx.method ?? "—"}
                </span>
                <span className="font-bold text-ink">{formatVnd(tx.amount)}</span>
                <span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[tx.status]}`}
                  >
                    {walletTxStatusLabel[tx.status]}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
