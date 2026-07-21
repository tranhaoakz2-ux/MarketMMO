import { Clock } from "lucide-react";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerPreOrderItems } from "@/lib/queries";
import SellerPreOrderPanel from "@/components/SellerPreOrderPanel";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerPreOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerPreOrderItems(seller!.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-black text-foreground">
          <Clock className="h-5 w-5 text-brand-dark" /> Đặt trước
        </h1>
        <p className="text-xs text-muted">
          Quản lý sản phẩm &quot;sắp có hàng&quot; và theo dõi các đơn đặt trước đang chờ giao.
        </p>
      </div>

      <SellerPreOrderPanel />

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Đơn đặt trước đang chờ giao</h2>
        <SellerOrdersTable items={items} emptyLabel="Chưa có đơn đặt trước nào." />
      </div>
    </div>
  );
}

export const metadata = { title: "Đặt trước — Quản Lý Bán Hàng — MarketMMO" };
