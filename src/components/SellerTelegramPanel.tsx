"use client";

import { CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TextInput,
} from "@/components/seller-demo/DemoKit";

type Status = {
  configured: boolean;
  linked: boolean;
  pending: boolean;
  chatId: string | null;
};

const STEPS = [
  "Mở Telegram, tìm bot @userinfobot và bấm Start để lấy Chat ID của bạn.",
  "Nhập Chat ID vào ô bên dưới rồi bấm Liên kết — hệ thống gửi mã 6 số tới Telegram.",
  "Nhập lại mã 6 số để xác nhận đúng là tài khoản của bạn.",
];

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
    (async () => {
      await load();
    })();
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

  const wrap = (children: React.ReactNode) => (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Telegram Bot"
        subtitle="Liên kết Telegram để nhận thông báo đơn mới, khiếu nại, giải ngân... từ MarketMMO."
      />
      {(error || message) && (
        <div className="flex flex-col gap-2">
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
          {message && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">{message}</p>}
        </div>
      )}
      {children}
    </div>
  );

  if (!status) return wrap(<Card><p className="py-4 text-center text-sm text-muted">Đang tải...</p></Card>);

  if (!status.configured) {
    return wrap(
      <Card>
        <p className="text-sm text-muted">
          Telegram Bot chưa được cấu hình phía hệ thống (thiếu{" "}
          <code className="rounded bg-surface-alt px-1 font-mono">TELEGRAM_BOT_TOKEN</code> trong{" "}
          <code className="rounded bg-surface-alt px-1 font-mono">.env</code>). Liên hệ quản trị viên để
          bật tính năng này.
        </p>
      </Card>
    );
  }

  if (status.linked) {
    return wrap(
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-foreground">Đã liên kết Telegram</p>
                <StatusBadge tone="success" dot>Đang hoạt động</StatusBadge>
              </div>
              <p className="text-xs text-muted">
                Chat ID <span className="font-mono font-bold text-foreground">{status.chatId}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => call("test")}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Gửi tin thử
            </Button>
            <Button variant="danger" size="sm" disabled={loading} onClick={() => call("unlink")}>
              <Trash2 className="h-3.5 w-3.5" /> Huỷ liên kết
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (status.pending) {
    return wrap(
      <Card>
        <SectionTitle>Xác nhận liên kết</SectionTitle>
        <p className="mb-3 text-sm text-foreground">
          Đã gửi mã xác nhận tới Chat ID <span className="font-mono font-bold">{status.chatId}</span>. Kiểm tra
          Telegram và nhập mã bên dưới.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Mã 6 số">
              <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="Nhập mã 6 số" />
            </Field>
          </div>
          <Button className="shrink-0" disabled={loading || !code} onClick={() => call("confirm", { code })}>
            Xác nhận
          </Button>
        </div>
      </Card>
    );
  }

  // Chưa liên kết — hướng dẫn + nhập Chat ID
  return wrap(
    <Card>
      <SectionTitle>Cách liên kết</SectionTitle>
      <ul className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-start gap-2.5 text-sm text-foreground/80">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Chat ID (chỉ số)">
            <TextInput value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="VD: 190287xxxx" />
          </Field>
        </div>
        <Button className="shrink-0" disabled={loading || !chatId} onClick={() => call("link", { chatId })}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Liên kết
        </Button>
      </div>
    </Card>
  );
}
