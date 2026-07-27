"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import WelcomeModal, { WELCOME_MODAL_STORAGE_KEY } from "@/components/WelcomeModal";

// Bảng điều khiển CHỈ tồn tại ở trang demo này — trang thật sẽ không có gì
// tương tự, chỉ mount thẳng <WelcomeModal /> một lần. `resetKey` dùng để ép
// remount <WelcomeModal>, khiến effect đọc localStorage của nó chạy lại từ
// đầu (giống hệt việc tải lại trang, nhưng không cần refresh cả trang demo).
export default function WelcomeModalPreview() {
  const [resetKey, setResetKey] = useState(0);
  const [justReset, setJustReset] = useState(false);

  const showAgain = () => {
    try {
      localStorage.removeItem(WELCOME_MODAL_STORAGE_KEY);
    } catch {
      // bỏ qua nếu trình duyệt chặn localStorage
    }
    setResetKey((k) => k + 1);
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2500);
  };

  return (
    <>
      <div className="fixed bottom-5 left-5 z-40 flex w-[240px] flex-col gap-2 rounded-2xl border border-border-c bg-surface p-4 shadow-xl">
        <p className="text-xs font-black text-foreground">🎛️ Bảng điều khiển DEMO</p>
        <p className="text-[11px] leading-snug text-muted">
          Chỉ có ở trang xem trước này — trang chủ thật sẽ không có bảng này.
        </p>
        <button
          onClick={showAgain}
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-bold text-ink transition hover:bg-brand-dark"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Hiện lại popup
        </button>
        {justReset && (
          <p className="text-[10px] font-semibold text-success">
            Đã xoá trạng thái &quot;đã đóng&quot; — popup sẽ hiện lại sau ~0.5s.
          </p>
        )}
      </div>

      <WelcomeModal key={resetKey} />
    </>
  );
}
