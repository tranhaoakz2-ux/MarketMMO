"use client";

import { CheckCircle2, Mail, Send } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      return;
    }
    setMessage(data.message);
  };

  if (message) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-sm text-ink">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Nhập email đã dùng để đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
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
        {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
      </button>
    </form>
  );
}
