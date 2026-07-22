"use client";

import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ConversationSummary = {
  id: string;
  otherUser: { id: string; name: string; isSystemBot: boolean; sellerSlug: string | null };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  attachment: { url: string; name: string | null; type: "IMAGE" | "FILE" } | null;
  createdAt: string;
  isMine: boolean;
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

export default function ChatInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/messages/conversations/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, []);

  // Khởi tạo: load danh sách hội thoại, và nếu tới từ ?with=<userId> (nút
  // "Nhắn tin" ở trang shop) thì tự get-or-create hội thoại rồi mở luôn.
  useEffect(() => {
    const withUserId = searchParams.get("with");
    (async () => {
      if (withUserId) {
        const res = await fetch("/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: withUserId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedId(data.id);
        }
        router.replace("/tin-nhan");
      }
      await loadConversations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll danh sách hội thoại định kỳ.
  useEffect(() => {
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load + poll tin nhắn của hội thoại đang mở.
  useEffect(() => {
    if (!selectedId) {
      (async () => {
        setMessages(null);
      })();
      return;
    }
    // Reset để lần load đầu của hội thoại mới luôn cuộn xuống đáy (xem effect
    // cuộn bên dưới).
    prevMessageCountRef.current = 0;
    (async () => {
      await loadMessages(selectedId);
    })();
    const interval = setInterval(() => loadMessages(selectedId), 7000);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  // Chỉ tự cuộn xuống khi số tin nhắn THẬT SỰ tăng (tin mới hoặc vừa mở hội
  // thoại) — không cuộn lại ở mỗi lần poll (7s) nếu không có gì mới. Đồng
  // thời chỉ set scrollTop của ĐÚNG khung chat (không dùng scrollIntoView)
  // để không kéo theo cuộn cả trang ngoài lên vị trí khung chat — đây chính
  // là nguyên nhân lỗi thật đã gặp: nếu người dùng cuộn trang xuống dưới
  // khung chat, scrollIntoView cũ sẽ tự cuộn cả trang lên lại mỗi ~7s.
  useEffect(() => {
    if (!messages) return;
    if (messages.length === prevMessageCountRef.current) return;
    prevMessageCountRef.current = messages.length;
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // Sau khi đọc 1 hội thoại, đồng bộ lại unreadCount=0 cho nó trong danh
  // sách bên trái ngay (không cần chờ lần poll tiếp theo).
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setConversations((prev) =>
        prev ? prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)) : prev
      );
    })();
  }, [selectedId, messages]);

  const clearPendingFile = useCallback(() => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  }, [pendingPreviewUrl]);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setAttachError("Ảnh vượt quá 5MB.");
      return;
    }
    setAttachError(null);
    clearPendingFile();
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setAttachError("File vượt quá 10MB.");
      return;
    }
    setAttachError(null);
    clearPendingFile();
    setPendingFile(file);
  };

  const handleSend = async () => {
    if (!selectedId || (!draft.trim() && !pendingFile)) return;
    setSending(true);
    setAttachError(null);
    const form = new FormData();
    form.append("content", draft.trim());
    if (pendingFile) form.append("file", pendingFile);

    const res = await fetch(`/api/messages/conversations/${selectedId}`, {
      method: "POST",
      body: form,
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      clearPendingFile();
      loadMessages(selectedId);
      loadConversations();
    } else {
      const data = await res.json().catch(() => null);
      setAttachError(data?.error ?? "Không thể gửi tin nhắn.");
    }
  };

  const filtered = (conversations ?? []).filter((c) => {
    if (tab === "unread" && c.unreadCount === 0) return false;
    if (search.trim() && !c.otherUser.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const selectedConv = conversations?.find((c) => c.id === selectedId);

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm md:h-[calc(100vh-220px)] md:min-h-[640px] md:grid-cols-[380px_1fr]">
      {/* Danh sách hội thoại */}
      <div
        className={`flex flex-col border-border-c md:border-r ${selectedId ? "hidden md:flex" : "flex"}`}
      >
        <div className="border-b border-border-c p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border-c px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm người đã nhắn..."
              className="w-full text-sm focus:outline-none"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setTab("all")}
              className={`flex-1 rounded-full border-2 px-3 py-2 text-sm font-bold transition hover:border-brand-dark ${
                tab === "all"
                  ? "border-transparent bg-brand text-ink"
                  : "border-transparent bg-surface-alt text-muted"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`flex-1 rounded-full border-2 px-3 py-2 text-sm font-bold transition hover:border-brand-dark ${
                tab === "unread"
                  ? "border-transparent bg-brand text-ink"
                  : "border-transparent bg-surface-alt text-muted"
              }`}
            >
              Chưa xem
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations === null ? (
            <p className="p-4 text-sm text-muted">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">Chưa có hội thoại nào.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center gap-3 border-b border-border-c px-4 py-4 text-left transition hover:bg-surface-alt ${
                  selectedId === c.id ? "bg-surface-alt" : ""
                }`}
              >
                <Avatar size={48} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[15px] font-bold text-foreground">{c.otherUser.name}</p>
                    <span className="shrink-0 text-xs text-muted">
                      {timeLabel(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted">{c.lastMessage ?? "..."}</p>
                    {c.unreadCount > 0 && (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Khung chat */}
      <div className={`flex flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
        {!selectedId || !selectedConv ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted">
            <MessageCircle className="h-10 w-10 text-border-c" />
            Chọn 1 hội thoại để bắt đầu
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border-c p-4">
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1.5 hover:bg-surface-alt md:hidden"
                aria-label="Quay lại"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {selectedConv.otherUser.sellerSlug ? (
                <Link
                  href={`/shop/${selectedConv.otherUser.sellerSlug}`}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <Avatar
                    size={44}
                    className="shrink-0 transition group-hover:ring-2 group-hover:ring-brand-dark"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground group-hover:underline">
                      {selectedConv.otherUser.name}
                    </p>
                    <p className="text-xs text-success">Đang online</p>
                  </div>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size={44} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">
                      {selectedConv.otherUser.name}
                    </p>
                    <p className="text-xs text-success">Đang online</p>
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6">
              {messages === null ? (
                <p className="text-sm text-muted">Đang tải...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] ${
                          m.isMine
                            ? "bg-brand text-ink"
                            : "bg-surface-alt text-foreground"
                        }`}
                      >
                        {m.attachment?.type === "IMAGE" && (
                          <a href={m.attachment.url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh đính kèm chat, phục vụ qua route được bảo vệ nên không dùng next/image được */}
                            <img
                              src={m.attachment.url}
                              alt={m.attachment.name ?? "Ảnh đính kèm"}
                              className={`max-h-64 rounded-lg object-cover ${m.content ? "mb-2" : ""}`}
                            />
                          </a>
                        )}
                        {m.attachment?.type === "FILE" && (
                          <a
                            href={m.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:underline ${m.content ? "mb-2" : ""}`}
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{m.attachment.name ?? "Tệp đính kèm"}</span>
                          </a>
                        )}
                        {m.content}
                        <p
                          className={`mt-1 text-[11px] ${m.isMine ? "text-foreground/60" : "text-muted"}`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border-c p-4">
              {attachError && (
                <p className="mb-2 text-xs font-semibold text-danger">{attachError}</p>
              )}
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2">
                  {pendingPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview ảnh cục bộ trước khi gửi (object URL, không phải asset)
                    <img
                      src={pendingPreviewUrl}
                      alt="Xem trước"
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {pendingFile.name}
                  </span>
                  <button
                    onClick={clearPendingFile}
                    className="shrink-0 rounded-full p-1 hover:bg-border-c"
                    aria-label="Bỏ đính kèm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePickImage}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                  className="hidden"
                  onChange={handlePickFile}
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-info/15 text-info transition hover:bg-info/25"
                  aria-label="Gửi ảnh"
                  type="button"
                >
                  <ImageIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success/15 text-success transition hover:bg-success/25"
                  aria-label="Gửi file"
                  type="button"
                >
                  <Paperclip className="h-6 w-6" />
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-full border border-border-c px-5 py-3 text-[15px] bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || (!draft.trim() && !pendingFile)}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-ink transition hover:bg-brand-dark disabled:opacity-50"
                  aria-label="Gửi"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
