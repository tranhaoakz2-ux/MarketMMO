"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  linked: boolean;
  pending: boolean;
  chatId: string | null;
};

export default function SellerTelegramPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [chatId, setChatId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/seller/telegram");
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const call = async (action: string, extra: Record<string, string> = {}) => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/seller/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra.");
      return;
    }
    setMessage("Thành công.");
    load();
  };

  if (!status) return <p className="text-sm text-muted">Đang tải...</p>;

  if (!status.configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
        Telegram Bot chưa được cấu hình phía hệ thống (thiếu{" "}
        <code className="rounded bg-surface-alt px-1">TELEGRAM_BOT_TOKEN</code> trong{" "}
        <code className="rounded bg-surface-alt px-1">.env</code>). Liên hệ quản trị viên để
        bật tính năng này.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
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

      {status.linked ? (
        <>
          <p className="text-sm text-ink">
            Đã liên kết với Chat ID <span className="font-mono font-bold">{status.chatId}</span>.
            Bạn sẽ nhận thông báo qua Telegram.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => call("test")}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Gửi tin nhắn thử
            </button>
            <button
              onClick={() => call("unlink")}
              disabled={loading}
              className="rounded-full bg-danger/10 px-4 py-2 text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-60"
            >
              Huỷ liên kết
            </button>
          </div>
        </>
      ) : status.pending ? (
        <>
          <p className="text-sm text-ink">
            Đã gửi mã xác nhận tới Chat ID <span className="font-mono font-bold">{status.chatId}</span>.
            Kiểm tra Telegram và nhập mã bên dưới.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã 6 số"
              className="flex-1 rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            />
            <button
              onClick={() => call("confirm", { code })}
              disabled={loading || !code}
              className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
            >
              Xác nhận
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            1. Mở Telegram, tìm bot của sàn (theo hướng dẫn quản trị viên cung cấp), nhấn{" "}
            <strong>Start</strong>.
            <br />
            2. Lấy Chat ID của bạn (vd nhắn cho @userinfobot) và nhập vào ô dưới.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Chat ID (chỉ số)"
              className="flex-1 rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
            />
            <button
              onClick={() => call("link", { chatId })}
              disabled={loading || !chatId}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Gửi mã xác nhận
            </button>
          </div>
        </>
      )}
    </div>
  );
}
