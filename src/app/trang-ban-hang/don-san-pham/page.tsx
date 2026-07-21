import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerOrderItems } from "@/lib/queries";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerProductOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerOrderItems(seller!.id, { service: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-foreground">Đơn sản phẩm</h1>
        <p className="text-xs text-muted">
          Danh sách đơn hàng thuộc các danh mục sản phẩm (tài khoản số, Steam Key...).
        </p>
      </div>
      <SellerOrdersTable items={items} emptyLabel="Chưa có đơn hàng sản phẩm nào." />
    </div>
  );
}

export const metadata = { title: "Đơn sản phẩm — Quản Lý Bán Hàng — MarketMMO" };
