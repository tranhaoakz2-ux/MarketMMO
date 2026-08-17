"use client";

import { AlertTriangle, Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { generateTotp, secondsRemaining } from "@/lib/totp";

// Vòng đếm ngược tròn — thuần hiển thị, tính từ đúng `remaining`/30 (progressPercent)
// đã có sẵn, không đụng tới cách sinh mã/đếm giây gốc.
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function TotpTool() {
  const [secretInput, setSecretInput] = useState("");
  const [activeSecret, setActiveSecret] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeSecret) {
      (async () => {
        setCode(null);
      })();
      return;
    }

    let cancelled = false;

    const tick = async () => {
      try {
        const otp = await generateTotp(activeSecret);
        if (cancelled) return;
        if (!otp) {
          setError("Mã bí mật không hợp lệ (định dạng Base32).");
          setCode(null);
        } else {
          setError(null);
          setCode(otp);
        }
      } catch {
        if (!cancelled) setError("Không thể tạo mã OTP từ chuỗi này.");
      }
      setRemaining(secondsRemaining());
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSecret]);

  const handleGetCode = () => {
    if (!secretInput.trim()) {
      setError("Vui lòng nhập mã bí mật 2FA.");
      setActiveSecret(null);
      return;
    }
    setError(null);
    setActiveSecret(secretInput);
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const progressPercent = (remaining / 30) * 100;
  // Chỉ tách khoảng trắng giữa 2 nhóm 3 số để DỄ ĐỌC hơn (vd "123 456") —
  // thuần định dạng lúc hiển thị, nút sao chép vẫn dùng đúng `code` gốc
  // (không có khoảng trắng) nên dán vào form đăng nhập không bị lỗi.
  const displayCode = code ? `${code.slice(0, 3)} ${code.slice(3)}` : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-brand-dark" /> Chuỗi mã 2FA (Secret Key)
        </label>
        <textarea
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          placeholder="Nhập chuỗi ký tự bí mật (VD: JBSWY3DPEHPK3PXP)"
          rows={3}
          className="w-full rounded-xl border border-border-c bg-surface px-3.5 py-3 font-mono text-sm text-foreground transition-colors focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/25"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
          Đây là chuỗi bí mật bạn nhận được khi bật xác minh 2 bước (thường ở
          dạng chữ và số, hiển thị cùng mã QR). Mã được tính toán hoàn toàn
          trên trình duyệt của bạn — MarketMMO không lưu hay gửi mã bí mật
          này đi bất cứ đâu.
        </p>
      </div>

      <button
        onClick={handleGetCode}
        className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-black uppercase tracking-wide text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
      >
        Lấy Mã Code Ngay
      </button>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {code && !error && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border-2 border-brand-dark/40 bg-brand-light/20 px-4 py-7 text-center sm:py-8">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-dark">
            Mã xác thực của bạn
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <p className="font-mono text-[44px] font-black leading-none tracking-wide text-foreground sm:text-[64px]">
              {displayCode}
            </p>
            <button
              onClick={handleCopy}
              aria-label="Sao chép mã"
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black transition ${
                copied
                  ? "bg-success text-white"
                  : "bg-ink text-white hover:-translate-y-0.5 hover:bg-brand hover:text-ink hover:shadow-md"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Đã chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Sao chép
                </>
              )}
            </button>
          </div>

          {/* Vòng đếm ngược tròn thay cho thanh tiến trình cũ — cùng số liệu
              (progressPercent từ remaining/30), chỉ đổi cách vẽ. */}
          <div className="relative grid h-24 w-24 place-items-center">
            <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="7"
                className="stroke-border-c"
              />
              <circle
                cx="48"
                cy="48"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-brand-dark transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressPercent / 100)}
              />
            </svg>
            <span className="absolute text-lg font-black tabular-nums text-foreground">
              {remaining}s
            </span>
          </div>
          <p className="text-xs text-muted">Mã tự động cập nhật sau mỗi 30 giây</p>
        </div>
      )}

      {!code && !error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-c bg-surface-alt/40 px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-alt text-muted">
            <KeyRound className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <p className="max-w-[280px] text-sm text-muted">
            Nhập mã bí mật ở trên rồi nhấn &quot;Lấy Mã Code Ngay&quot; để lấy mã xác thực 2 bước.
          </p>
        </div>
      )}
    </div>
  );
}
