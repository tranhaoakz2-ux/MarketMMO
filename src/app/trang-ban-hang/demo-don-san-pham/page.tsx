import { PageHeader } from "@/components/seller-demo/DemoKit";
import DemoOrdersTable from "@/components/seller-demo/DemoOrdersTable";
import { PRODUCT_ORDERS } from "@/components/seller-demo/mock";

// DEMO redesign — Đơn sản phẩm. Dữ liệu giả, không đụng trang thật.
export default function DemoProductOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn sản phẩm"
        subtitle="Đơn hàng thuộc danh mục sản phẩm (tài khoản số, Steam key...)."
      />
      <DemoOrdersTable items={PRODUCT_ORDERS} emptyLabel="Chưa có đơn hàng sản phẩm nào." />
    </div>
  );
}

export const metadata = { title: "Demo · Đơn sản phẩm — MarketMMO" };
