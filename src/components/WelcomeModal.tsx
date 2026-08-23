"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Headphones, Scale, Send, ShieldCheck, X, Zap } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { WELCOME_MODAL_CONFIG } from "@/lib/welcome-modal-config";

// Key lưu trong localStorage — đổi theo `version` trong welcome-modal-config.ts
// nên tăng version = mọi khách thấy lại popup dù đã từng đóng (xem giải thích
// đầy đủ trong file config). Export để trang demo dùng lại đúng key khi muốn
// xoá trạng thái "đã đóng" để xem lại popup.
export const WELCOME_MODAL_STORAGE_KEY = `marketmmo_welcome_modal_v${WELCOME_MODAL_CONFIG.version}_dismissed_at`;

const WELCOME_MODAL_ICONS = { ShieldCheck, Zap, Scale, Headphones } as const;

// Popup có 2 phiên bản riêng theo theme của site (biến thể `dark:` kích hoạt
// theo `[data-theme="dark"]` trên <html>, xem @custom-variant trong
// globals.css) — KHÔNG còn cố định 1 tông tối như bản trước: sáng dùng nền
// trắng/xám nhạt sang trọng, tối dùng nền than/đen (--color-ink) như cũ. Vàng
// thương hiệu luôn là điểm nhấn ở cả 2 bản (logo, icon, CTA, viền hover).

const cardVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = localStorage.getItem(WELCOME_MODAL_STORAGE_KEY);
      const reshowMs = WELCOME_MODAL_CONFIG.reshowAfterDays * 24 * 60 * 60 * 1000;
      const dismissedAt = raw ? Number(raw) : null;
      const shouldShow =
        !dismissedAt ||
        (reshowMs > 0 && Number.isFinite(dismissedAt) && Date.now() - dismissedAt > reshowMs);
      if (shouldShow) {
        timer = setTimeout(() => setOpen(true), WELCOME_MODAL_CONFIG.autoOpenDelayMs);
      }
    } catch {
      // localStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt, cài đặt
      // trình duyệt...) — coi như không hiện popup thay vì làm lỗi trang.
    }
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, String(Date.now()));
    } catch {
      // Không ghi được thì thôi — chỉ ảnh hưởng việc popup có hiện lại
      // sớm hơn dự kiến ở lần ghé thăm sau, không phải lỗi nghiêm trọng.
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-y-auto rounded-3xl bg-gradient-to-b from-white to-surface-alt shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] dark:from-ink dark:to-ink-soft dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] dark:ring-white/[0.06] sm:max-w-lg"
            style={{ maxHeight: "90vh" }}
          >
            <button
              onClick={close}
              aria-label="Đóng"
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/5 text-ink/50 backdrop-blur transition hover:bg-black/10 hover:text-ink dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.14] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Hero: vàng chỉ làm điểm nhấn (glow + logo + chip tên thương hiệu), không tô đặc */}
            <div className="relative overflow-hidden rounded-t-3xl px-7 pb-7 pt-11 text-center sm:px-10">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-[70px]"
              />

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark shadow-[0_10px_30px_-8px_var(--color-brand)] ring-1 ring-black/10 dark:ring-white/20 sm:h-[72px] sm:w-[72px]">
                <Image
                  src="/logo-mark.png"
                  alt={WELCOME_MODAL_CONFIG.brandName}
                  width={44}
                  height={36}
                  className="h-8 w-auto object-contain sm:h-9"
                />
              </div>

              {WELCOME_MODAL_CONFIG.eyebrow && (
                <p className="relative mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-dark">
                  {WELCOME_MODAL_CONFIG.eyebrow}
                </p>
              )}
              <h2
                id="welcome-modal-title"
                className="relative mt-2 text-2xl font-black leading-tight text-ink dark:text-white sm:text-[28px]"
              >
                <span className="block">{WELCOME_MODAL_CONFIG.titleLine1}</span>
                <span className="mt-1.5 inline-block rounded-xl bg-brand px-3 py-0.5 text-ink">
                  {WELCOME_MODAL_CONFIG.brandName}
                </span>
              </h2>
              <p className="relative mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink/60 dark:text-white/55 sm:text-sm">
                {WELCOME_MODAL_CONFIG.subtitle}
              </p>
            </div>

            <div className="mx-7 h-px bg-gradient-to-r from-transparent via-black/[0.08] to-transparent dark:via-white/[0.12] sm:mx-10" />

            <div className="px-7 pb-8 pt-6 sm:px-10">
              <motion.div
                className="grid grid-cols-2 gap-3"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                {WELCOME_MODAL_CONFIG.features.map((f) => {
                  const Icon = WELCOME_MODAL_ICONS[f.icon as keyof typeof WELCOME_MODAL_ICONS];
                  return (
                    <motion.div
                      key={f.title}
                      variants={cardItemVariants}
                      whileHover={{ y: -2 }}
                      className="flex flex-col items-center rounded-xl border-[0.5px] border-border-c bg-surface px-3.5 py-[18px] text-center transition-colors duration-300 hover:border-brand/40"
                    >
                      <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] border-[1.5px] border-[#EF9F27] bg-transparent">
                        <Icon className="h-[22px] w-[22px] text-[#BA7517]" strokeWidth={1.75} />
                      </div>
                      <p className="mt-2.5 text-sm font-medium text-foreground">{f.title}</p>
                      <p className="mt-0.5 text-xs leading-[1.55] text-muted">{f.description}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href={WELCOME_MODAL_CONFIG.fanpageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border-[0.5px] border-border-c bg-surface py-2.5 text-[13px] font-medium text-foreground/80 transition hover:border-brand/40"
                >
                  <span className="text-[18px] font-black leading-none text-[#185FA5]">f</span>
                  Fanpage
                </a>
                <a
                  href={WELCOME_MODAL_CONFIG.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border-[0.5px] border-border-c bg-surface py-2.5 text-[13px] font-medium text-foreground/80 transition hover:border-brand/40"
                >
                  <Send className="h-[18px] w-[18px] -rotate-45 text-[#378ADD]" strokeWidth={1.75} />
                  Telegram
                </a>
              </div>

              <button
                onClick={close}
                className="group relative mt-3 w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand to-brand-dark py-3.5 text-sm font-black text-ink shadow-[0_10px_28px_-10px_var(--color-brand)] transition hover:shadow-[0_12px_32px_-8px_var(--color-brand)] active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
                <span className="relative">{WELCOME_MODAL_CONFIG.ctaLabel}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
