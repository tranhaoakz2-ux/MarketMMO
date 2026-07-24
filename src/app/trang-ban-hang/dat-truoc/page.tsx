import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerPreOrderItems } from "@/lib/queries";
import { PageHeader } from "@/components/seller-demo/DemoKit";
import SellerPreOrderPanel from "@/components/SellerPreOrderPanel";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerPreOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerPreOrderItems(seller!.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đặt trước"
        subtitle='Quản lý sản phẩm "sắp có hàng" và theo dõi đơn đặt trước đang chờ giao.'
      />

      <SellerPreOrderPanel />

      <div className="flex flex-col gap-3">
        <h2 className="text-[13px] font-black text-foreground">Đơn đặt trước đang chờ giao</h2>
        <SellerOrdersTable items={items} emptyLabel="Chưa có đơn đặt trước nào." />
      </div>
    </div>
  );
}

export const metadata = { title: "Đặt trước — Quản Lý Bán Hàng — MarketMMO" };
