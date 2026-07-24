import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerOrderItems } from "@/lib/queries";
import { PageHeader } from "@/components/seller-demo/DemoKit";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerProductOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerOrderItems(seller!.id, { service: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn sản phẩm"
        subtitle="Đơn hàng thuộc danh mục sản phẩm (tài khoản số, Steam key...)."
      />
      <SellerOrdersTable items={items} emptyLabel="Chưa có đơn hàng sản phẩm nào." />
    </div>
  );
}

export const metadata = { title: "Đơn sản phẩm — Quản Lý Bán Hàng — MarketMMO" };
