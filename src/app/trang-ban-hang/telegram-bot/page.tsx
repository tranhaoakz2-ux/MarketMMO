import { Send } from "lucide-react";
import SellerTelegramPanel from "@/components/SellerTelegramPanel";

export default function SellerTelegramBotPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black text-ink">
          <Send className="h-5 w-5 text-brand-dark" /> Telegram Bot
        </h1>
        <p className="text-xs text-muted">
          Liên kết Telegram để nhận thông báo từ MarketMMO.
        </p>
      </div>
      <SellerTelegramPanel />
    </div>
  );
}

export const metadata = { title: "Telegram Bot — Quản Lý Bán Hàng — MarketMMO" };
