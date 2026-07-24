import { PageHeader } from "@/components/seller-demo/DemoKit";
import DemoOrdersTable from "@/components/seller-demo/DemoOrdersTable";
import { SERVICE_ORDERS } from "@/components/seller-demo/mock";

// DEMO redesign — Đơn dịch vụ. Dữ liệu giả, không đụng trang thật.
export default function DemoServiceOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn dịch vụ"
        subtitle="Đơn hàng thuộc danh mục dịch vụ (Boosting, ChatGPT, YouTube)."
      />
      <DemoOrdersTable items={SERVICE_ORDERS} emptyLabel="Chưa có đơn hàng dịch vụ nào." />
    </div>
  );
}

export const metadata = { title: "Demo · Đơn dịch vụ — MarketMMO" };
