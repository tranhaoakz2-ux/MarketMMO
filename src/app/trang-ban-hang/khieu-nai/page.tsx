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
          Khi người mua báo lỗi, yêu cầu đến <b className="text-foreground">bạn bảo hành trước</b>: bạn có
          24 giờ để chủ động hoàn tiền cho người mua, hoặc từ chối. Nếu bạn từ chối hoặc quá hạn,
          người mua có thể đưa khiếu nại lên sàn để admin quyết định.
        </p>
      </div>
      <SellerDisputesList disputes={disputes} />
    </div>
  );
}

export const metadata = { title: "Khiếu nại — Quản Lý Bán Hàng — MarketMMO" };
