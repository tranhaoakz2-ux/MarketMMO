"use client";

import {
  AlertTriangle,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  History,
  LogIn,
  QrCode,
  RefreshCw,
  Wallet,
} from "lucide-react";
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

const statusDotStyle: Record<WalletTxStatus, string> = {
  PENDING: "bg-brand-dark",
  CONFIRMED: "bg-success",
  REJECTED: "bg-danger",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
          copied
            ? "bg-success/10 text-success"
            : "bg-surface-alt text-foreground hover:bg-brand-light/60 hover:text-ink"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Đã chép
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

  const loadTransactions = async () => {
    const res = await fetch("/api/wallet/transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
    }
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      await loadTransactions();
    })();
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border-c bg-surface p-10 text-center shadow-sm sm:p-14">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-light text-brand-dark">
          <Wallet className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-base font-bold text-foreground">Cần đăng nhập để nạp tiền</p>
          <p className="mt-1 text-sm text-muted">
            Đăng nhập vào tài khoản MarketMMO để nạp tiền vào ví.
          </p>
        </div>
        <Link
          href="/dang-nhap?callbackUrl=/nap-tien"
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-black text-ink shadow-[0_10px_25px_-8px_rgba(224,196,0,0.55)] transition hover:bg-brand-dark"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (method === "vnpay") {
      if (!amount || amount < 10000) {
        setError("Số tiền nạp tối thiểu là 10.000đ.");
        return;
      }
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
      setLoading(true);
      const res = await fetch("/api/wallet/deposit-usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid: txid.trim() }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Không thể gửi yêu cầu nạp tiền.");
        return;
      }
      if (data.pending) {
        setMessage(data.message ?? "Đang chờ xác minh, liên hệ admin nếu chờ lâu.");
      } else {
        setMessage(
          `Đã xác minh và cộng ${formatVnd(data.credited)} vào ví (${data.usdtAmount} USDT, tỷ giá ${data.rate.toLocaleString("vi-VN")}đ/USDT).`
        );
        await update();
      }
      setTxid("");
      loadTransactions();
      return;
    }

    if (!amount || amount < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/wallet/deposit-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        method,
        note: `Nội dung CK: ${transferCode}`,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể gửi yêu cầu nạp tiền.");
      return;
    }
    setMessage(
      "Đã gửi yêu cầu nạp tiền. Vui lòng chuyển khoản đúng nội dung ở trên, admin sẽ duyệt sau khi nhận được."
    );
    loadTransactions();
    // Tạo mã mới cho lần nạp tiếp theo — tránh dùng lại đúng mã vừa gửi.
    setCodeNonce(randomCodeNonce());
  };

  return (
    <>
      {/* Khối số dư — card trắng gọn (đồng bộ với 2 card bên dưới), KHÔNG
          còn nền tối cao cấp cũ (quá to/trống). 1 hàng ngang: icon+label+số
          dư bên trái, nút làm mới bên phải. Số dư dùng text-foreground
          (theo theme: gần đen ở light, gần trắng ở dark) để đủ tương phản
          trên bg-surface — KHÔNG dùng text-brand/brand-dark ở đây vì vàng
          không đủ tương phản trên nền trắng, vàng chỉ còn ở badge icon nhỏ. */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border-c bg-surface px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-ink">
            <Wallet className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Số dư ví hiện tại</p>
            <p className="text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-[26px]">
              {formatVnd(session.user.walletBalance)}
            </p>
          </div>
        </div>

        <button
          onClick={() => update()}
          className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-border-c bg-surface-alt px-3.5 py-2 text-xs font-bold text-foreground transition hover:border-brand-dark/40 hover:bg-brand-light/40 hover:text-brand-dark"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới số dư
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-light text-brand-dark">
              <CreditCard className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-black text-foreground">Chọn phương thức nạp tiền</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            <label
              className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                method === "vnpay"
                  ? "border-brand-dark bg-brand-light/30 shadow-sm"
                  : "border-border-c bg-surface hover:border-brand-dark/40 hover:bg-surface-alt"
              } ${!vnpayEnabled ? "cursor-not-allowed opacity-60 hover:border-border-c hover:bg-surface" : ""}`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "vnpay"}
                disabled={!vnpayEnabled}
                onChange={() => setMethod("vnpay")}
                className="sr-only"
              />
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  method === "vnpay" ? "bg-brand text-ink" : "bg-surface-alt text-foreground/60"
                }`}
              >
                <QrCode className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">VNPay — tự động cộng tiền</p>
                  {!vnpayEnabled && (
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Chưa cấu hình
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {vnpayEnabled
                    ? "Chuyển hướng sang VNPay, số dư cộng ngay sau khi thanh toán"
                    : "Thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET trong .env"}
                </p>
              </div>
              {method === "vnpay" && (
                <span className="absolute right-3 top-3 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </label>

            <label
              className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                method === "bank"
                  ? "border-brand-dark bg-brand-light/30 shadow-sm"
                  : "border-border-c bg-surface hover:border-brand-dark/40 hover:bg-surface-alt"
              }`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "bank"}
                onChange={() => setMethod("bank")}
                className="sr-only"
              />
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  method === "bank" ? "bg-brand text-ink" : "bg-surface-alt text-foreground/60"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">Chuyển khoản ngân hàng</p>
                <p className="mt-0.5 text-xs text-muted">
                  Gửi yêu cầu, admin xác nhận sau khi nhận được chuyển khoản
                </p>
              </div>
              {method === "bank" && (
                <span className="absolute right-3 top-3 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </label>

            <label
              className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                method === "usdt"
                  ? "border-brand-dark bg-brand-light/30 shadow-sm"
                  : "border-border-c bg-surface hover:border-brand-dark/40 hover:bg-surface-alt"
              } ${!usdtInfo ? "cursor-not-allowed opacity-60 hover:border-border-c hover:bg-surface" : ""}`}
            >
              <input
                type="radio"
                name="method"
                checked={method === "usdt"}
                disabled={!usdtInfo}
                onChange={() => setMethod("usdt")}
                className="sr-only"
              />
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  method === "usdt" ? "bg-brand text-ink" : "bg-surface-alt text-foreground/60"
                }`}
              >
                <DollarSign className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">USDT (mạng TRC20)</p>
                  {!usdtInfo && (
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Chưa cấu hình
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {usdtInfo
                    ? `Quy đổi theo tỷ giá 1 USDT ≈ ${usdtInfo.rate.toLocaleString("vi-VN")}đ`
                    : "Thiếu USDT_TRC20_ADDRESS trong .env"}
                </p>
              </div>
              {method === "usdt" && (
                <span className="absolute right-3 top-3 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
          {method !== "usdt" && (
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-light text-brand-dark">
                <Banknote className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-black text-foreground">Số tiền nạp</h2>
            </div>
          )}
          <div className="flex flex-col gap-4">
            {method !== "usdt" && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        amount === value
                          ? "border-brand-dark bg-brand text-ink shadow-[0_8px_18px_-8px_rgba(224,196,0,0.6)]"
                          : "border-border-c bg-surface text-foreground hover:border-brand-dark/40 hover:bg-surface-alt"
                      }`}
                    >
                      {formatVnd(value)}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                    Hoặc nhập số tiền khác
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={10000}
                      step={10000}
                      value={amount ?? ""}
                      onChange={(e) => setAmount(Number(e.target.value) || null)}
                      placeholder="Nhập số tiền (VNĐ)"
                      className="w-full rounded-xl border border-border-c bg-surface px-3.5 py-3 text-sm font-semibold text-foreground focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                      VNĐ
                    </span>
                  </div>
                </div>
              </>
            )}

            {method === "bank" && (
              <div className="overflow-hidden rounded-2xl border border-border-c bg-surface-alt/60">
                <div className="flex items-center gap-2.5 border-b border-border-c bg-surface px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-light text-brand-dark">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-bold text-foreground">Thông tin chuyển khoản</p>
                </div>

                <div className="px-4">
                  {bankInfo?.bin && (
                    <div className="flex justify-center py-4">
                      <div className="rounded-2xl border border-border-c bg-white p-3 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ VietQR, không phải asset tĩnh trong repo nên không dùng next/image được */}
                        <img
                          src={`https://img.vietqr.io/image/${bankInfo.bin}-${bankInfo.accountNumber}-compact2.png?amount=${amount ?? ""}&addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(bankInfo.accountHolder)}`}
                          alt="Mã QR chuyển khoản VietQR"
                          className="h-48 w-48 rounded-lg object-contain sm:h-52 sm:w-52"
                        />
                      </div>
                    </div>
                  )}

                  {!bankInfo && (
                    <p className="pb-1 pt-3 text-xs leading-relaxed text-muted">
                      Hệ thống chưa cấu hình sẵn số tài khoản — sau khi gửi yêu
                      cầu, vui lòng liên hệ admin qua Zalo/Messenger (góc dưới
                      bên phải trang) để được hướng dẫn chuyển khoản.
                    </p>
                  )}

                  <div className="divide-y divide-border-c">
                    {bankInfo && (
                      <>
                        <CopyField label="Ngân hàng" value={bankInfo.bankName} />
                        <CopyField label="Số tài khoản" value={bankInfo.accountNumber} />
                        <CopyField label="Chủ tài khoản" value={bankInfo.accountHolder} />
                      </>
                    )}
                    <CopyField label="Nội dung chuyển khoản" value={transferCode} />
                  </div>
                </div>

                <p className="border-t border-border-c bg-brand-light/30 px-4 py-2.5 text-[11px] font-medium text-brand-dark">
                  Vui lòng chuyển đúng số tiền và ghi đúng nội dung trên để
                  yêu cầu được duyệt nhanh hơn.
                </p>
              </div>
            )}

            {method === "usdt" && usdtInfo && (
              <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04]">
                <div className="flex items-center gap-2.5 border-b border-emerald-500/20 bg-surface px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-bold text-foreground">Gửi USDT (mạng TRC20)</p>
                </div>

                <div className="px-4">
                  <div className="divide-y divide-emerald-500/15">
                    <CopyField label="Địa chỉ ví USDT-TRC20" value={usdtInfo.address} />
                  </div>
                  <p className="border-t border-emerald-500/15 py-3 text-xs leading-relaxed text-muted">
                    <b className="text-foreground">Bước 1:</b> Tự chuyển USDT (bất kỳ số lượng nào bạn muốn nạp)
                    từ ví/sàn của bạn tới địa chỉ trên. <b className="text-foreground">Bước 2:</b> Dán mã giao
                    dịch (TxID) bên dưới — hệ thống tự đọc đúng số USDT thật đã nhận trên blockchain và quy đổi
                    ra VNĐ, không cần bạn khai số tiền.
                  </p>
                  <div className="pb-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                      Mã giao dịch (TxID)
                    </label>
                    <input
                      type="text"
                      value={txid}
                      onChange={(e) => setTxid(e.target.value)}
                      placeholder="Dán mã giao dịch từ ví/sàn của bạn"
                      className="w-full rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-[11px] font-medium text-emerald-600">
                  Chỉ gửi USDT trên mạng TRC20 (Tron) — gửi sai mạng có thể
                  mất tiền. Hệ thống xác minh trên blockchain trước khi cộng tiền, có thể mất vài giây.
                </p>
              </div>
            )}

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}
            {message && (
              <p className="flex items-center gap-2 rounded-xl bg-success/10 px-3.5 py-2.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                loading || (method === "usdt" ? !usdtInfo || !txid.trim() : !amount)
              }
              className="rounded-full bg-brand py-3.5 text-sm font-black text-ink shadow-[0_10px_25px_-8px_rgba(224,196,0,0.55)] transition hover:bg-brand-dark hover:shadow-[0_10px_28px_-6px_rgba(224,196,0,0.65)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading
                ? "Đang xử lý..."
                : method === "vnpay"
                  ? `Nạp ${amount ? formatVnd(amount) : ""}`
                  : method === "usdt"
                    ? "Xác minh & nạp tiền"
                    : "Tôi đã chuyển khoản, xác nhận yêu cầu"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-light text-brand-dark">
            <History className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-black text-foreground">Lịch sử nạp tiền</h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
                <History className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <p className="text-sm font-bold text-foreground">Chưa có giao dịch nào</p>
              <p className="max-w-[260px] text-xs text-muted">
                Lịch sử các lần nạp tiền của bạn sẽ hiện ở đây.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: bảng thật */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-c bg-surface-alt text-[11px] font-bold uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Phương thức</th>
                      <th className="px-4 py-3">Số tiền</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-border-c transition last:border-0 hover:bg-surface-alt/60"
                      >
                        <td className="px-4 py-3.5 text-muted">
                          {new Date(tx.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3.5 text-foreground">
                          {walletMethodLabel[tx.method ?? ""] ?? tx.method ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums text-foreground">
                          {formatVnd(tx.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[tx.status]}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotStyle[tx.status]}`} />
                            {walletTxStatusLabel[tx.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: dạng thẻ */}
              <div className="flex flex-col divide-y divide-border-c md:hidden">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-col gap-1.5 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold tabular-nums text-foreground">
                        {formatVnd(tx.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[tx.status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDotStyle[tx.status]}`} />
                        {walletTxStatusLabel[tx.status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{walletMethodLabel[tx.method ?? ""] ?? tx.method ?? "—"}</span>
                      <span>{new Date(tx.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
