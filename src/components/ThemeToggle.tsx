"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

// Đọc theme hiện tại từ <html data-theme> (do inline script trong layout set
// trước hydrate) qua useSyncExternalStore — tránh setState-trong-effect và tránh
// mismatch hydrate: server snapshot luôn "light" (SSR render icon Moon), client
// đọc giá trị thật rồi React tự đồng bộ lại. MutationObserver cập nhật nút nếu
// data-theme đổi từ nơi khác.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage có thể bị chặn — vẫn đổi theme cho phiên hiện tại */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
      className={`flex h-[42px] w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-ink text-white transition hover:bg-ink-soft ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
