"use client";

// Tự refetch NGẦM dữ liệu server khi buyer quay lại tab sau khi rời đi lâu
// (kiểu Facebook/TikTok) — dùng Page Visibility API, KHÔNG bao giờ
// window.location.reload(). Dự án KHÔNG dùng React Query/SWR (trang công
// khai là Server Component fetch Prisma trực tiếp qua src/lib/queries.ts,
// force-dynamic — xem CLAUDE.md), nên "refetch" đúng nghĩa ở đây là
// router.refresh() của App Router: chạy lại Server Component của route hiện
// tại (tự phủ đúng "dữ liệu chính của trang đang xem" — sản phẩm/seller nổi
// bật ở trang chủ, danh sách sản phẩm ở trang danh mục... — KHÔNG cần code
// riêng cho từng trang) mà KHÔNG mất state client / scroll / không chớp
// trắng (đặc tính thiết kế sẵn của router.refresh(), khác hẳn full reload).
// Số dư ví hiển thị qua session (next-auth, xem Header.tsx đọc
// session.user.walletBalance) nên refetch riêng bằng useSession().update()
// — trigger lại callback jwt() đọc walletBalance mới nhất từ DB (xem
// src/auth.ts, nhánh "else if (token.id)").
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { REFRESH_AFTER_MS } from "@/lib/constants";

// Registry các lý do đang CHẶN refetch ngầm — vd buyer đang mở màn QR/
// countdown nạp USDT (xem DepositPanel.tsx gọi useSuppressRefresh bên dưới).
// Set được mutate TRỰC TIẾP (add/delete), KHÔNG qua setState — không nơi nào
// cần re-render khi 1 lý do bật/tắt, Set chỉ được ĐỌC đúng 1 lần tại thời
// điểm tab quay lại hiện.
const RefreshSuppressionContext = createContext<Set<string> | null>(null);

export function RefreshSuppressionProvider({ children }: { children: ReactNode }) {
  // useState (không phải useRef) để đọc giá trị an toàn ngay trong render —
  // React 19 cấm đọc ref.current lúc render (react-hooks/refs). Hàm khởi tạo
  // chỉ chạy đúng 1 lần, Set vẫn là 1 instance ổn định suốt vòng đời provider.
  const [reasons] = useState(() => new Set<string>());
  return <RefreshSuppressionContext.Provider value={reasons}>{children}</RefreshSuppressionContext.Provider>;
}

/**
 * Đăng ký 1 lý do CHẶN refetch ngầm trong lúc `active` = true — gọi ở bất kỳ
 * component nào đang hiện màn hình không được phép bị gián đoạn (QR/countdown
 * nạp tiền, wizard nhiều bước, form quan trọng...). Tự gỡ đăng ký khi
 * unmount hoặc `active` chuyển false — KHÔNG cần buyer tự đóng gì.
 */
export function useSuppressRefresh(reason: string, active: boolean): void {
  const reasons = useContext(RefreshSuppressionContext);
  useEffect(() => {
    if (!reasons || !active) return;
    reasons.add(reason);
    return () => {
      reasons.delete(reason);
    };
  }, [reasons, reason, active]);
}

// Chặn refetch bổ sung theo heuristic DOM chung — KHÔNG cần từng modal/form
// tự gọi useSuppressRefresh(). Best-effort: chỉ bắt được modal gắn đúng
// chuẩn ARIA (role="dialog"/aria-modal, hoặc <dialog open>) — overlay tự
// dựng không gắn ARIA sẽ KHÔNG được nhận diện ở đây, nơi nào cần chặn CHẮC
// CHẮN thì tự gọi useSuppressRefresh() tường minh (đã làm cho DepositPanel).
function isInteractionBlocking(): boolean {
  if (document.querySelector('[role="dialog"], [aria-modal="true"], dialog[open]')) return true;

  // Buyer đang gõ dở 1 ô input/textarea có nội dung — tránh mất bản nháp.
  const active = document.activeElement;
  if (
    (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
    active.value.trim() !== ""
  ) {
    return true;
  }
  return false;
}

/**
 * Gọi ĐÚNG 1 LẦN ở cấp cao (src/components/Providers.tsx) để áp cho toàn
 * site. Lắng nghe document.visibilitychange — khi tab ẩn ghi lại thời điểm,
 * khi hiện lại nếu đã ẩn >= REFRESH_AFTER_MS VÀ không bị chặn (suppression
 * registry + heuristic modal/form) thì router.refresh() + refresh session ví.
 */
export function useRefreshOnReturn(): void {
  const router = useRouter();
  const { status, update } = useSession();
  const reasons = useContext(RefreshSuppressionContext);
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      // Chưa từng ghi nhận ẩn (vd effect vừa mount, tab đã hiện sẵn) — không
      // có gì để tính khoảng thời gian, bỏ qua.
      if (hiddenAt === null) return;
      if (Date.now() - hiddenAt < REFRESH_AFTER_MS) return;
      if (reasons && reasons.size > 0) return;
      if (isInteractionBlocking()) return;

      router.refresh();
      if (status === "authenticated") {
        update();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router, status, update, reasons]);
}
