import { AlertTriangle } from "lucide-react";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerDisputes } from "@/lib/queries";
import SellerDisputesList from "@/components/SellerDisputesList";

export const dynamic = "force-dynamic";

export default async function SellerDisputesPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const disputes = await getSellerDisputes(seller!.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black text-foreground">
          <AlertTriangle className="h-5 w-5 text-brand-dark" /> Khiếu nại
        </h1>
        <p className="text-xs text-muted">
          Người mua hoặc bạn có thể mở khiếu nại trên đơn hàng đang ký quỹ (từ trang Lịch sử
          đơn hàng của người mua). Chỉ admin quyết định kết quả cuối: hoàn tiền người mua hoặc
          giải ngân cho bạn.
        </p>
      </div>
      <SellerDisputesList disputes={disputes} />
    </div>
  );
}

export const metadata = { title: "Khiếu nại — Quản Lý Bán Hàng — MarketMMO" };
