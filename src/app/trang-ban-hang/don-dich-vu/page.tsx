import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerOrderItems } from "@/lib/queries";
import { PageHeader } from "@/components/seller-demo/DemoKit";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerServiceOrdersPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerOrderItems(seller!.id, { service: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn Dịch Vụ"
        subtitle="Đơn hàng dịch vụ (buyer cung cấp thông tin để bạn thực hiện) và các danh mục dịch vụ cũ (Boosting, ChatGPT, YouTube)."
      />
      <SellerOrdersTable items={items} emptyLabel="Chưa có đơn hàng dịch vụ nào." showServiceColumn />
    </div>
  );
}

export const metadata = { title: "Đơn Dịch Vụ — Quản Lý Bán Hàng — MarketMMO" };
