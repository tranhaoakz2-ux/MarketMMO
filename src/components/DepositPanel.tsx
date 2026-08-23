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
import Reveal from "@/components/Reveal";
import { formatVnd } from "@/lib/format";
import type { BankInfo, UsdtInfo } from "@/lib/payment/deposit";
import {
  MAX_USDT_DEPOSIT_VND,
  MIN_USDT_DEPOSIT_VND,
  walletMethodLabel,
  walletTxStatusLabel,
  type WalletTxStatus,
} from "@/lib/constants";

const quickAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

// Hậu tố ngẫu nhiên gắn thêm vào mã chuyển khoản (cùng với 6 ký tự cuối
// userId) để mỗi yêu cầu nạp tiền có nội dung RIÊNG BIỆT — tránh trường hợp 2
// lần nạp khác số tiền nhưng trùng nội dung, gây khó đối chiếu sao kê.
function randomCodeNonce(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

type DepositMethod = "vnpay" | "bank" | "usdt";

// Yêu cầu nạp USDT đang chờ (đã cấp số USDT định danh riêng) — xem
// POST /api/wallet/deposit-usdt/intent. Buyer PHẢI có 1 cái đang PENDING
// trước khi route xác nhận TxID có thể tự động cộng tiền (LAUNCH_AUDIT.md #1).
type UsdtDepositIntentView = {
  id: string;
  vndAmount: number;
  usdtAmount: string;
  address: string;
  expiresAt: string;
};

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

// Card khung ngoài dùng chung — cùng ngôn ngữ thiết kế với
// UserProfilePanel.tsx (tiêu đề uppercase tracking-wide + icon vàng thương
// hiệu) để trang Nạp tiền đồng bộ với trang Hồ sơ cá nhân.
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
        <Icon className="h-4 w-4 text-brand-dark" /> {title}
      </h2>
      {children}
    </div>
  );
}

function CopyField({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  /** Nhấn mạnh trực quan (dùng cho "Nội dung chuyển khoản" — khách hay ghi
      sai nên cần nổi bật hơn hẳn các dòng còn lại). Thuần hiển thị. */
  emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (emphasize) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border-2 border-brand-dark/50 bg-brand-light/25 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10.5px] font-black uppercase tracking-wide text-brand-dark">{label}</p>
          <p className="mt-0.5 truncate font-mono text-base font-black tracking-wide text-foreground">
            {value}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition ${
            copied
              ? "bg-success text-white"
              : "bg-ink text-white hover:-translate-y-0.5 hover:bg-brand hover:text-ink hover:shadow-md"
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-surface-alt/50">
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
  sepayEnabled,
}: {
  vnpayEnabled: boolean;
  bankInfo: BankInfo | null;
  usdtInfo: UsdtInfo | null;
  sepayEnabled: boolean;
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
  const [usdtIntent, setUsdtIntent] = useState<UsdtDepositIntentView | null>(null);
  const [usdtIntentLoading, setUsdtIntentLoading] = useState(false);

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

  // Khôi phục yêu cầu nạp USDT đang chờ (nếu có) — buyer refresh trang giữa
  // chừng không mất số USDT định danh/địa chỉ đã cấp.
  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch("/api/wallet/deposit-usdt/intent");
      if (res.ok) {
        const data = await res.json();
        if (data.intent) setUsdtIntent(data.intent);
      }
    })();
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm sm:p-14">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-light text-brand-dark">
          <Wallet className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-base font-bold text-foreground">Cần đăng nhập để nạp tiền</p>
          <p className="mt-1 text-sm text-muted">
            Đăng nhập vào tài khoản MaketMMO để nạp tiền vào ví.
          </p>
        </div>
        <Link
          href="/dang-nhap?callbackUrl=/nap-tien"
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const handleCreateUsdtIntent = async () => {
    setError(null);
    setMessage(null);
    if (!amount || amount < MIN_USDT_DEPOSIT_VND || amount > MAX_USDT_DEPOSIT_VND) {
      setError(
        `Số tiền nạp USDT phải từ ${formatVnd(MIN_USDT_DEPOSIT_VND)} đến ${formatVnd(MAX_USDT_DEPOSIT_VND)}.`
      );
      return;
    }
    setUsdtIntentLoading(true);
    const res = await fetch("/api/wallet/deposit-usdt/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vndAmount: amount }),
    });
    const data = await res.json();
    setUsdtIntentLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể tạo yêu cầu nạp USDT.");
      return;
    }
    setUsdtIntent(data);
  };

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
      if (!usdtIntent) {
        setError("Vui lòng tạo yêu cầu nạp USDT trước (chọn số tiền rồi bấm \"Tạo yêu cầu\").");
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
      } else if (data.creditedToSelf) {
        setMessage(`Đã xác minh và cộng ${formatVnd(data.credited)} vào ví (${data.usdtAmount} USDT).`);
        setUsdtIntent(null);
        await update();
      } else {
        // Giao dịch khớp yêu cầu của MỘT TÀI KHOẢN KHÁC (vd TxID này vốn của
        // người khác) — tiền đã cộng đúng cho chủ yêu cầu đó, KHÔNG PHẢI
        // tài khoản đang đăng nhập, nên không được báo "đã cộng vào ví bạn".
        setMessage(
          "Đã xác minh giao dịch trên blockchain, nhưng số tiền được cộng vào đúng tài khoản đã tạo yêu cầu nạp cho mã USDT này (không phải tài khoản bạn đang đăng nhập). Nếu bạn cho rằng có nhầm lẫn, vui lòng liên hệ admin."
        );
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
      sepayEnabled
        ? "Đã ghi nhận yêu cầu. Chuyển khoản đúng nội dung ở trên — hệ thống sẽ tự động cộng tiền trong vài phút sau khi nhận được."
        : "Đã gửi yêu cầu nạp tiền. Vui lòng chuyển khoản đúng nội dung ở trên, admin sẽ duyệt sau khi nhận được."
    );
    loadTransactions();
    // Tạo mã mới cho lần nạp tiếp theo — tránh dùng lại đúng mã vừa gửi.
    setCodeNonce(randomCodeNonce());
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero số dư — cùng ngôn ngữ với khối header trang Hồ sơ cá nhân (dải
          gradient vàng nhạt phía trên, icon badge, số liệu lớn). */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border-c bg-surface p-6 shadow-sm sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand/12 to-transparent"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-ink shadow-sm">
                <Wallet className="h-7 w-7" strokeWidth={2} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Số dư ví hiện tại</p>
                <p className="mt-0.5 text-2xl font-black tracking-tight text-foreground tabular-nums sm:text-[28px]">
                  {formatVnd(session.user.walletBalance)}
                </p>
              </div>
            </div>

            <button
              onClick={() => update()}
              className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-border-c bg-surface-alt px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:border-brand-dark/40 hover:bg-brand-light/40 hover:text-brand-dark"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới số dư
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Reveal delay={0.05}>
            <SectionCard icon={CreditCard} title="Chọn phương thức nạp tiền">
              <div className="flex flex-col gap-2.5">
                <label
                  className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
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
                        <span className="rounded-full border border-border-c bg-surface-alt px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
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
                  className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
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
                      {sepayEnabled
                        ? "Tự động cộng tiền trong vài phút sau khi chuyển khoản"
                        : "Gửi yêu cầu, admin xác nhận sau khi nhận được chuyển khoản"}
                    </p>
                  </div>
                  {method === "bank" && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-ink">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </label>

                <label
                  className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
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
                        <span className="rounded-full border border-border-c bg-surface-alt px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
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
            </SectionCard>
          </Reveal>

          {(method !== "usdt" || !usdtIntent) && (
            <Reveal delay={0.08}>
              <SectionCard icon={Banknote} title="Số tiền nạp">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        onClick={() => setAmount(value)}
                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                          amount === value
                            ? "border-brand-dark bg-brand text-ink shadow-sm"
                            : "border-border-c bg-surface text-foreground hover:-translate-y-0.5 hover:border-brand-dark/40 hover:bg-surface-alt"
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
                        min={method === "usdt" ? MIN_USDT_DEPOSIT_VND : 10000}
                        step={10000}
                        value={amount ?? ""}
                        onChange={(e) => setAmount(Number(e.target.value) || null)}
                        placeholder="Nhập số tiền (VNĐ)"
                        className="w-full rounded-xl border border-border-c bg-surface px-3.5 py-3 text-sm font-semibold text-foreground transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                        VNĐ
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </Reveal>
          )}

          {method === "bank" && (
            <Reveal delay={0.11}>
              <SectionCard icon={Building2} title="Thông tin chuyển khoản">
                <div className="flex flex-col gap-4">
                  {bankInfo?.bin && (
                    <div className="flex justify-center">
                      <div className="rounded-2xl border border-border-c bg-white p-3 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh QR động từ VietQR, không phải asset tĩnh trong repo nên không dùng next/image được */}
                        <img
                          src={`https://img.vietqr.io/image/${bankInfo.bin}-${bankInfo.accountNumber}-compact2.png?amount=${amount ?? ""}&addInfo=${encodeURIComponent(transferCode)}&accountName=${encodeURIComponent(bankInfo.accountHolder)}`}
                          alt="Mã QR chuyển khoản VietQR"
                          className="h-52 w-52 rounded-lg object-contain sm:h-56 sm:w-56"
                        />
                      </div>
                    </div>
                  )}

                  {!bankInfo && (
                    <p className="text-xs leading-relaxed text-muted">
                      Hệ thống chưa cấu hình sẵn số tài khoản — sau khi gửi yêu
                      cầu, vui lòng liên hệ admin qua Zalo/Messenger (góc dưới
                      bên phải trang) để được hướng dẫn chuyển khoản.
                    </p>
                  )}

                  {/* Nội dung chuyển khoản nhấn mạnh trực quan riêng — khách
                      hay ghi sai dòng này nhất, đặt lên trước để dễ thấy/copy
                      nhất, tách khỏi nhóm 3 dòng thông tin còn lại. */}
                  <CopyField label="Nội dung chuyển khoản" value={transferCode} emphasize />

                  {bankInfo && (
                    <div className="divide-y divide-border-c rounded-xl border border-border-c px-3">
                      <CopyField label="Ngân hàng" value={bankInfo.bankName} />
                      <CopyField label="Số tài khoản" value={bankInfo.accountNumber} />
                      <CopyField label="Chủ tài khoản" value={bankInfo.accountHolder} />
                    </div>
                  )}

                  <p className="flex items-start gap-2 rounded-xl bg-brand-light/25 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-brand-dark">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {sepayEnabled
                      ? "Bắt buộc ghi đúng nội dung chuyển khoản ở trên để hệ thống tự động khớp và cộng tiền — thiếu/sai nội dung sẽ cần admin xử lý tay, có thể chậm hơn."
                      : "Vui lòng chuyển đúng số tiền và ghi đúng nội dung trên để yêu cầu được duyệt nhanh hơn."}
                  </p>
                </div>
              </SectionCard>
            </Reveal>
          )}

          {method === "usdt" && usdtInfo && !usdtIntent && (
            <Reveal delay={0.11}>
              <SectionCard icon={DollarSign} title="Bước 1 — Tạo yêu cầu nạp USDT">
                <div className="flex flex-col gap-4">
                  <p className="text-xs leading-relaxed text-muted">
                    Mạng TRC20 không hỗ trợ ghi nội dung chuyển khoản riêng, nên hệ thống sẽ cấp cho bạn{" "}
                    <b className="text-foreground">1 số USDT định danh riêng</b> (kèm vài số thập phân duy nhất) —
                    bạn cần chuyển ĐÚNG số đó (không làm tròn) để hệ thống tự nhận đúng giao dịch của bạn, không
                    thể bị người khác &ldquo;cướp&rdquo; nhầm.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateUsdtIntent}
                    disabled={
                      usdtIntentLoading || !amount || amount < MIN_USDT_DEPOSIT_VND || amount > MAX_USDT_DEPOSIT_VND
                    }
                    className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                  >
                    {usdtIntentLoading
                      ? "Đang tạo yêu cầu..."
                      : `Tạo yêu cầu nạp ${amount ? formatVnd(amount) : ""}`}
                  </button>
                </div>
              </SectionCard>
            </Reveal>
          )}

          {method === "usdt" && usdtInfo && usdtIntent && (
            <Reveal delay={0.11}>
              <SectionCard icon={DollarSign} title="Bước 2 — Chuyển USDT & xác nhận">
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border-2 border-brand-dark/50 bg-brand-light/25 p-3.5">
                    <p className="text-[10.5px] font-black uppercase tracking-wide text-brand-dark">
                      Chuyển ĐÚNG số USDT sau (bắt buộc chính xác từng số thập phân)
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xl font-black tracking-wide text-foreground">
                      {usdtIntent.usdtAmount} USDT
                    </p>
                  </div>
                  <div className="rounded-xl border border-border-c px-3">
                    <CopyField label="Địa chỉ ví USDT-TRC20" value={usdtIntent.address} />
                  </div>
                  <p className="text-xs leading-relaxed text-muted">
                    Sau khi xác minh, hệ thống sẽ cộng đúng{" "}
                    <b className="text-foreground">{formatVnd(usdtIntent.vndAmount)}</b> vào ví. Yêu cầu hết hạn lúc{" "}
                    <b className="text-foreground">{new Date(usdtIntent.expiresAt).toLocaleString("vi-VN")}</b> —
                    quá hạn phải tạo yêu cầu mới (số USDT định danh cũ sẽ không còn hiệu lực).
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                      Mã giao dịch (TxID)
                    </label>
                    <input
                      type="text"
                      value={txid}
                      onChange={(e) => setTxid(e.target.value)}
                      placeholder="Dán mã giao dịch từ ví/sàn của bạn"
                      className="w-full rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
                    />
                  </div>
                  <p className="flex items-start gap-2 rounded-xl bg-brand-light/25 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-brand-dark">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Chỉ gửi USDT trên mạng TRC20 (Tron) — gửi sai mạng có thể
                    mất tiền. Hệ thống xác minh trên blockchain trước khi cộng tiền, có thể mất vài giây.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUsdtIntent(null);
                      setTxid("");
                      setError(null);
                      setMessage(null);
                    }}
                    className="self-start text-xs font-bold text-muted hover:text-foreground hover:underline"
                  >
                    Huỷ, đổi số tiền khác
                  </button>
                </div>
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.14}>
            <div className="flex flex-col gap-3">
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

              {/* Ở bước 1 của USDT (chưa có yêu cầu), nút hành động là "Tạo yêu
                  cầu" bên trong SectionCard riêng phía trên — ẩn nút chung
                  này để tránh 2 nút cùng lúc không rõ nút nào làm gì. */}
              {!(method === "usdt" && !usdtIntent) && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || (method === "usdt" ? !usdtInfo || !usdtIntent || !txid.trim() : !amount)}
                  className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading
                    ? "Đang xử lý..."
                    : method === "vnpay"
                      ? `Nạp ${amount ? formatVnd(amount) : ""}`
                      : method === "usdt"
                        ? "Xác minh & nạp tiền"
                        : "Tôi đã chuyển khoản, xác nhận yêu cầu"}
                </button>
              )}
            </div>
          </Reveal>
        </div>

        <div className="lg:sticky lg:top-24">
          <Reveal delay={0.08} direction="left">
            <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
                <History className="h-4 w-4 text-brand-dark" /> Lịch sử nạp tiền
              </h2>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
                    <History className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                  <p className="text-sm font-bold text-foreground">Chưa có giao dịch nào</p>
                  <p className="text-xs text-muted">
                    Lịch sử các lần nạp tiền của bạn sẽ hiện ở đây.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border-c">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold tabular-nums text-foreground">
                          {formatVnd(tx.amount)}
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[tx.status]}`}
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
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
