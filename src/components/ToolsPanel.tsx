"use client";

import { Info, KeyRound, Network, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";
import Reveal from "@/components/Reveal";
import FacebookCheckerTool from "@/components/FacebookCheckerTool";
import ProxyCheckerTool from "@/components/ProxyCheckerTool";
import TotpTool from "@/components/TotpTool";

const tabs = [
  { id: "2fa", label: "Lấy mã 2FA", icon: KeyRound },
  { id: "proxy", label: "Check Live Proxy", icon: Network },
  { id: "facebook", label: "Check Live Facebook", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

const titles: Record<TabId, string> = {
  "2fa": "Trình Bóc Mã 2FA (TOTP)",
  proxy: "Kiểm Tra Live Proxy",
  facebook: "Check Live Facebook",
};

const instructions: Record<TabId, string[]> = {
  "2fa": [
    "Dán chuỗi ký tự bí mật (2FA Secret) được cấp khi mua tài khoản hoặc bật xác thực 2 lớp vào ô nhập liệu.",
    'Nhấn nút "LẤY MÃ CODE NGAY".',
    "Hệ thống sẽ hiển thị mã 6 chữ số và tự động làm mới khi mã hết hạn.",
    "Bạn có thể nhấn nút sao chép để dán vào các trang đăng nhập.",
  ],
  proxy: [
    "Dán danh sách proxy cần kiểm tra vào ô nhập liệu, mỗi dòng 1 proxy.",
    "Định dạng: IP:Port:User:Pass hoặc Tên|IP:Port:User:Pass.",
    'Nhấn nút "KIỂM TRA PROXY NGAY".',
    "Hệ thống sẽ kết nối thử tới từng proxy và báo kết quả Live/Die kèm thời gian phản hồi.",
  ],
  facebook: [
    "Dán link hồ sơ Facebook (vd: facebook.com/zuck) hoặc username vào ô nhập liệu, mỗi dòng 1 tài khoản.",
    'Nhấn nút "CHECK LIVE FACEBOOK NGAY".',
    "Hệ thống chỉ kiểm tra hồ sơ công khai, không yêu cầu và không hỏi mật khẩu tài khoản.",
    "Kết quả chỉ mang tính tham khảo: chắc chắn khi phát hiện rõ dấu hiệu đã bị xoá/khoá, các trường hợp còn lại chỉ là suy đoán vì Facebook giới hạn xem ẩn danh.",
  ],
};

export default function ToolsPanel() {
  const [active, setActive] = useState<TabId>("2fa");

  return (
    <div className="mx-auto max-w-[820px] px-4 pb-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        {/* Hero — cùng ngôn ngữ với khối header trang Hồ sơ cá nhân/Nạp tiền
            (dải gradient vàng nhạt phía trên, icon badge, tiêu đề lớn). */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border-c bg-surface p-6 shadow-sm sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand/12 to-transparent"
            />
            <div className="relative flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-ink shadow-sm">
                <Wrench className="h-7 w-7" strokeWidth={2} />
              </span>
              <div>
                <h1 className="text-xl font-black text-foreground sm:text-2xl">Bộ Công Cụ Tiện Ích</h1>
                <p className="mt-1 text-sm text-muted">
                  Lấy mã xác thực 2FA và kiểm tra nhanh proxy/tài khoản Facebook.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border-c bg-surface p-2 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-brand text-ink shadow-sm"
                      : "text-foreground/80 hover:bg-surface-alt hover:text-brand-dark"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-foreground">
              {titles[active]}
            </h2>
            {active === "2fa" ? (
              <TotpTool />
            ) : active === "proxy" ? (
              <ProxyCheckerTool />
            ) : (
              <FacebookCheckerTool />
            )}
          </div>
        </Reveal>

        <Reveal delay={0.11}>
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
              <Info className="h-4 w-4 text-brand-dark" /> Hướng dẫn sử dụng
            </h2>
            <ol className="flex flex-col gap-1.5 text-sm text-foreground/80">
              {instructions[active].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-muted">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
