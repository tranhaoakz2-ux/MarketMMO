import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerOutOfStockCount } from "@/lib/queries";
import { getInsuranceFundTarget } from "@/lib/site-config";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SellerSidebar from "@/components/SellerSidebar";

export const dynamic = "force-dynamic";

// Áp dụng cho TOÀN BỘ trang con dưới /trang-ban-hang/** qua cơ chế kế thừa
// metadata của Next.js (trang con nào không tự khai báo `robots` riêng sẽ
// nhận đúng giá trị này) — khu vực quản lý bán hàng chỉ dành cho seller đã
// đăng nhập, không có giá trị gì khi bị Google index.
export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function SellerDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/trang-ban-hang");

  const seller = await getSellerForUser(session.user.id);
  if (!seller) redirect("/tro-thanh-nguoi-ban");

  const insuranceFundTarget = await getInsuranceFundTarget();
  const outOfStockCount = await getSellerOutOfStockCount(seller.id);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {seller.suspended && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <b>Gian hàng của bạn đang bị tạm khoá.</b> Sản phẩm đã bị ẩn khỏi
              trang công khai và bạn tạm thời không thể đăng sản phẩm, rút tiền
              hay thao tác bán hàng. Vui lòng liên hệ quản trị viên để được hỗ trợ.
            </div>
          )}
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row">
              <SellerSidebar
                shopName={seller.shopName}
                avatarUrl={seller.avatarUrl}
                verified={seller.verified}
                insuranceBalance={seller.insuranceBalance}
                insuranceFundTarget={insuranceFundTarget}
                outOfStockCount={outOfStockCount}
              />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
