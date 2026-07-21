"use client";

import { CheckCircle2, KeyRound, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <p className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger">
        Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới tại{" "}
        <Link href="/quen-mat-khau" className="underline">
          trang quên mật khẩu
        </Link>
        .
      </p>
    );
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      return;
    }
    setDone(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">Mật khẩu mới</label>
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
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
