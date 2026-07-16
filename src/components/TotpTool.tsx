"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { generateTotp, secondsRemaining } from "@/lib/totp";

export default function TotpTool() {
  const [secretInput, setSecretInput] = useState("");
  const [activeSecret, setActiveSecret] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeSecret) {
      setCode(null);
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound className="h-4 w-4" /> Chuỗi mã 2FA (Secret Key)
        </label>
        <textarea
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          placeholder="Nhập chuỗi ký tự bí mật (VD: JBSWY3DPEHPK3PXP)"
          rows={3}
          className="w-full rounded-lg border border-border-c bg-surface px-3 py-2.5 font-mono text-sm focus:border-brand-dark focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1.5 text-xs text-muted">
          Đây là chuỗi bí mật bạn nhận được khi bật xác minh 2 bước (thường ở
          dạng chữ và số, hiển thị cùng mã QR). Mã được tính toán hoàn toàn
          trên trình duyệt của bạn — MarketMMO không lưu hay gửi mã bí mật
          này đi bất cứ đâu.
        </p>
      </div>

      <button
        onClick={handleGetCode}
        className="w-full rounded-lg bg-brand py-2.5 text-base font-black uppercase tracking-wide text-ink transition hover:bg-brand-dark"
      >
        Lấy Mã Code Ngay
      </button>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      {code && !error && (
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <p className="text-sm text-muted">Mã xác thực của bạn là:</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[56px] font-black leading-none tracking-tight text-ink sm:text-[80px]">
              {code}
            </p>
            <button
              onClick={handleCopy}
              aria-label="Sao chép"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-c text-ink transition hover:bg-surface-alt"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 h-[5px] w-full max-w-[200px] overflow-hidden rounded-full bg-border-c">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted">Mã tự động cập nhật sau mỗi 30 giây</p>
        </div>
      )}

      {!code && !error && (
        <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
          Nhập mã bí mật ở trên rồi nhấn &quot;Lấy Mã Code Ngay&quot; để lấy mã xác thực 2 bước.
        </div>
      )}
    </div>
  );
}
