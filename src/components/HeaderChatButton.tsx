"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HeaderChatButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch("/api/messages/unread-count");
      if (!res.ok || !active) return;
      const data = await res.json();
      if (active) setCount(data.count);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/tin-nhan"
      className="relative flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-4 py-2 transition hover:brightness-110"
      aria-label="Tin nhắn"
    >
      <MessageCircle className="h-5 w-5 text-white" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
