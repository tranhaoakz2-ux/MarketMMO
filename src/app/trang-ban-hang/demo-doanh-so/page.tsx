import DemoRevenueChart from "@/components/seller-demo/DemoRevenueChart";

export const dynamic = "force-dynamic";

// DEMO xem trước biểu đồ "Doanh Số Theo Thời Gian" với dữ liệu MẪU — TÁCH
// BIỆT hoàn toàn khỏi trang Tổng quan thật (/trang-ban-hang). Không gọi
// backend, không seed DB. Layout seller (Header/Sidebar/Footer + guard đăng
// nhập/seller) được tái sử dụng qua routing, KHÔNG bị sửa — xem
// src/app/trang-ban-hang/layout.tsx.
export default function DemoDoanhSoPage() {
  return <DemoRevenueChart />;
}

export const metadata = { title: "Demo · Doanh số theo thời gian — Quản Lý Bán Hàng — MarketMMO" };
