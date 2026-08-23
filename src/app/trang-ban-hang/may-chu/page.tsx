import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerManualProvisionItems } from "@/lib/queries";
import { PageHeader } from "@/components/seller-demo/DemoKit";
import SellerOrdersTable from "@/components/SellerOrdersTable";

export const dynamic = "force-dynamic";

export default async function SellerManualProvisionPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const items = await getSellerManualProvisionItems(seller!.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Máy Chủ (VPS)"
        subtitle='Nhập thông tin đăng nhập cho từng đơn VPS/Server "giao thủ công" trong hạn đã cam kết.'
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-[13px] font-black text-foreground">Đơn Máy Chủ</h2>
        <SellerOrdersTable items={items} emptyLabel="Chưa có đơn máy chủ nào." showManualProvisionColumn />
      </div>
    </div>
  );
}

export const metadata = { title: "Máy Chủ (VPS) — Quản Lý Bán Hàng — MaketMMO" };
