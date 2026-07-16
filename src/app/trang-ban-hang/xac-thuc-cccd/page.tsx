import { BadgeCheck } from "lucide-react";
import SellerVerificationPanel from "@/components/SellerVerificationPanel";

export default function SellerIdVerificationPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black text-ink">
          <BadgeCheck className="h-5 w-5 text-brand-dark" /> Xác thực CCCD
        </h1>
        <p className="text-xs text-muted">
          Xác thực danh tính để nhận badge &quot;Đã xác thực&quot; công khai trên gian hàng,
          tăng độ tin cậy với người mua.
        </p>
      </div>
      <SellerVerificationPanel />
    </div>
  );
}

export const metadata = { title: "Xác thực CCCD — Quản Lý Bán Hàng — MarketMMO" };
