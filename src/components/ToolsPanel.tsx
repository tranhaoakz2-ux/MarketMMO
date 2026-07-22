"use client";

import { Info, KeyRound, Network, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";
import FacebookCheckerTool from "@/components/FacebookCheckerTool";
import ProxyCheckerTool from "@/components/ProxyCheckerTool";
import TotpTool from "@/components/TotpTool";

const tabs = [
  { id: "2fa", label: "Lấy mã 2FA", icon: KeyRound },
  { id: "proxy", label: "Check Live Proxy", icon: Network },
  { id: "facebook", label: "Check Live Facebook", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

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
      <div className="overflow-hidden rounded-2xl border border-border-c shadow-sm">
        <div className="flex items-center gap-2.5 bg-ink px-6 py-5 text-white">
          <Wrench className="h-5 w-5 text-brand" />
          <h1 className="text-lg font-black">Bộ Công Cụ Tiện Ích</h1>
        </div>

        <div className="flex items-center gap-2 border-b border-border-c bg-surface px-4 py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-brand text-ink"
                    : "text-foreground hover:bg-surface-alt hover:text-brand-dark"
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-surface p-4 sm:p-6">
          <div className="rounded-xl border border-border-c bg-surface-alt p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-black text-foreground">
              {active === "2fa"
                ? "Trình Bóc Mã 2FA (TOTP)"
                : active === "proxy"
                  ? "Kiểm Tra Live Proxy"
                  : "Check Live Facebook"}
            </h2>
            {active === "2fa" ? (
              <TotpTool />
            ) : active === "proxy" ? (
              <ProxyCheckerTool />
            ) : (
              <FacebookCheckerTool />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border-c bg-surface p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
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
    </div>
  );
}
