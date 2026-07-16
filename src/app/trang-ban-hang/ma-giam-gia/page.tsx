import { Tag } from "lucide-react";
import SellerDiscountCodesPanel from "@/components/SellerDiscountCodesPanel";

export default function SellerDiscountCodesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black text-ink">
          <Tag className="h-5 w-5 text-brand-dark" /> Mã giảm giá
        </h1>
        <p className="text-xs text-muted">
          Tạo mã giảm giá áp dụng cho toàn bộ sản phẩm của gian hàng bạn. Người mua nhập mã ở
          giỏ hàng hoặc trang mua ngay.
        </p>
      </div>
      <SellerDiscountCodesPanel />
    </div>
  );
}

export const metadata = { title: "Mã giảm giá — Quản Lý Bán Hàng — MarketMMO" };
