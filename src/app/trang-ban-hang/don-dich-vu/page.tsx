import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerOrderItems } from "@/lib/queries";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerServiceOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerOrderItems(seller!.id, { service: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-ink">Đơn dịch vụ</h1>
        <p className="text-xs text-muted">
          Danh sách đơn hàng thuộc các danh mục dịch vụ (Boosting, ChatGPT, YouTube).
        </p>
      </div>
      <SellerOrdersTable items={items} emptyLabel="Chưa có đơn hàng dịch vụ nào." />
    </div>
  );
}

export const metadata = { title: "Đơn dịch vụ — Quản Lý Bán Hàng — MarketMMO" };
