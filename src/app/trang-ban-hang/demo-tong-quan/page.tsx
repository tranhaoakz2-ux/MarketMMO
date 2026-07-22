import DemoSellerOverview from "@/components/DemoSellerOverview";

export const dynamic = "force-dynamic";

// DEMO redesign trang Tổng quan — TÁCH BIỆT hoàn toàn khỏi trang thật
// (/trang-ban-hang). Chỉ render component demo với dữ liệu GIẢ, không gọi
// backend, không import component của trang thật. Layout seller (Header/
// Sidebar/Footer + guard) được tái sử dụng qua routing, KHÔNG bị sửa.
export default function DemoTongQuanPage() {
  return <DemoSellerOverview />;
}

export const metadata = { title: "Demo · Tổng quan — Quản Lý Bán Hàng — MarketMMO" };
