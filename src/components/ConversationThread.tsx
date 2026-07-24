"use client";

import { Loader2, Scale, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; content: string; isMine: boolean; createdAt: string };

// Luồng chat THẬT gắn với 1 khiếu nại (Cách B). Tự lấy conversationId qua
// /api/disputes/[id]/conversation (đã kiểm quyền: chỉ buyer+seller của đơn),
// rồi đọc/gửi tin qua /api/messages/conversations/[cid]?disputeId=<id> — tin
// gắn disputeId nên KHÔNG lẫn ChatInbox chung. Cập nhật bằng polling ~7s (dùng
// lại cơ chế của hệ chat sẵn có, không WebSocket).
export default function ConversationThread({ disputeId }: { disputeId: string }) {
  const [convId, setConvId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("người kia");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 1) Lấy conversationId (get-or-create, có party-check ở server).
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/disputes/${disputeId}/conversation`);
      if (!alive) return;
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Không thể mở hội thoại.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setConvId(data.conversationId);
      setOtherName(data.otherName ?? "người kia");
    })();
    return () => {
      alive = false;
    };
  }, [disputeId]);

  // 2) Poll tin nhắn của ĐÚNG luồng khiếu nại này.
  useEffect(() => {
    if (!convId) return;
    let alive = true;
    const loadMessages = async () => {
      const res = await fetch(`/api/messages/conversations/${convId}?disputeId=${disputeId}`);
      if (!alive || !res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoading(false);
    };
    loadMessages();
    const t = setInterval(loadMessages, 7000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [convId, disputeId]);

  // Tự cuộn xuống cuối khi có tin mới.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !convId) return;
    setSending(true);
    const form = new FormData();
    form.append("content", content);
    form.append("disputeId", disputeId);
    const res = await fetch(`/api/messages/conversations/${convId}`, { method: "POST", body: form });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Không gửi được tin.");
      return;
    }
    setText("");
    setError(null);
    // Nạp lại ngay (không đợi tick polling).
    const r = await fetch(`/api/messages/conversations/${convId}?disputeId=${disputeId}`);
    if (r.ok) setMessages((await r.json()).messages ?? []);
  };

  if (error) {
    return <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1 text-[10px] text-muted">
        <Scale className="h-3 w-3" /> Trao đổi với <b className="text-foreground">{otherName}</b> — luồng
        riêng cho khiếu nại này, tách khỏi tin nhắn chung.
      </p>

      <div ref={scrollRef} className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-3 text-center text-xs text-muted">Đang tải...</p>
        ) : messages.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted">Chưa có tin nhắn. Bắt đầu trao đổi nguyên nhân lỗi...</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.isMine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                  m.isMine ? "rounded-br-sm bg-brand text-ink" : "rounded-bl-sm border border-border-c bg-surface text-foreground"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted">
                {m.isMine ? "Bạn" : otherName} · {new Date(m.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Nhập tin nhắn..."
          className="flex-1 rounded-lg border border-border-c bg-surface px-3 py-2 text-xs text-foreground focus:border-brand-dark focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim() || !convId}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-ink transition hover:bg-brand-dark disabled:opacity-50"
          aria-label="Gửi"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
