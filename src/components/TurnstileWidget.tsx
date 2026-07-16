"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    __turnstileOnLoad?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileOnLoad&render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    window.__turnstileOnLoad = () => resolve();
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileWidgetHandle = {
  /** Sinh lại challenge mới trên CÙNG 1 widget instance (không unmount/remount
   * component) — dùng sau mỗi lần submit thất bại vì token Turnstile chỉ
   * dùng được 1 lần. Callback `onVerify` gốc vẫn được gọi lại bình thường
   * khi giải xong challenge mới. */
  reset: () => void;
};

const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    siteKey: string;
    onVerify: (token: string) => void;
    onExpire?: () => void;
  }
>(function TurnstileWidget({ siteKey, onVerify, onExpire }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Giữ callback mới nhất trong ref — widget chỉ render() đúng 1 lần (theo
  // siteKey), "callback" truyền vào render() lúc đó phải luôn gọi tới phiên
  // bản MỚI NHẤT của onVerify/onExpire (props có thể đổi identity giữa các
  // lần render cha), tránh đóng gói (closure) 1 phiên bản cũ vĩnh viễn.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => {
            console.error("Turnstile render error-callback fired.");
          },
        });
      } catch (err) {
        console.error("Turnstile render() threw:", err);
      }
    });

    return () => {
      cancelled = true;
      // remove() (không phải reset()) khi component thật sự unmount — huỷ
      // hẳn widget instance đó, tránh còn sót instance "ma" gây nhầm lẫn nếu
      // sau này render() lại được gọi cho 1 lần mount khác.
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
});

export default TurnstileWidget;
