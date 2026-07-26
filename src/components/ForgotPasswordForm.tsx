"use client";

import { CheckCircle2, KeyRound, Lock, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Step = "email" | "code";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sendCode = async () => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
    }
    return data?.message as string | undefined;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const message = await sendCode();
      setNotice(message ?? null);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const message = await sendCode();
      setNotice(message ?? "Đã gửi lại mã xác nhận mới.");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-sm text-foreground">Đặt lại mật khẩu thành công!</p>
        <Link
          href="/dang-nhap"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Nhập mã xác nhận 6 số vừa gửi tới <b className="text-foreground">{email}</b>, cùng mật
          khẩu mới của bạn.
        </p>

        {notice && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            {notice}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Mã xác nhận
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
            <KeyRound className="h-4 w-4 text-muted" />
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Nhập mã 6 số"
              className="w-full text-sm tracking-[0.3em] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Mật khẩu mới
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
            <Lock className="h-4 w-4 text-muted" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Xác nhận mật khẩu mới
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
            <Lock className="h-4 w-4 text-muted" />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full text-sm focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setNotice(null);
            }}
            className="font-semibold text-muted hover:text-foreground"
          >
            ← Đổi email khác
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-brand-dark hover:underline disabled:opacity-60"
          >
            {resending ? "Đang gửi lại..." : "Gửi lại mã"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Nhập email đã dùng để đăng ký, chúng tôi sẽ gửi mã xác nhận 6 số cho bạn.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
        <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
          <Mail className="h-4 w-4 text-muted" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email"
            className="w-full text-sm focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
      </button>
    </form>
  );
}
