import { PageHeader } from "@/components/seller-demo/DemoKit";
import DemoOrdersTable from "@/components/seller-demo/DemoOrdersTable";
import DemoPreOrderToggle from "@/components/seller-demo/DemoPreOrderToggle";
import { PREORDER_ORDERS } from "@/components/seller-demo/mock";

// DEMO redesign — Đặt trước. Dữ liệu giả, không đụng trang thật.
export default function DemoPreOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đặt trước"
        subtitle='Quản lý sản phẩm "sắp có hàng" và theo dõi đơn đặt trước đang chờ giao.'
      />
      <DemoPreOrderToggle />
      <div className="flex flex-col gap-3">
        <h2 className="text-[13px] font-black text-foreground">Đơn đặt trước đang chờ giao</h2>
        <DemoOrdersTable items={PREORDER_ORDERS} emptyLabel="Chưa có đơn đặt trước nào." />
      </div>
    </div>
  );
}

export const metadata = { title: "Demo · Đặt trước — MarketMMO" };
