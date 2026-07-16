import { redirect } from "next/navigation";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SellerSidebar from "@/components/SellerSidebar";

export const dynamic = "force-dynamic";

export default async function SellerDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/trang-ban-hang");

  const seller = await getSellerForUser(session.user.id);
  if (!seller) redirect("/tro-thanh-nguoi-ban");

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-6 lg:flex-row">
              <SellerSidebar
                shopName={seller.shopName}
                verified={seller.verified}
                insuranceBalance={seller.insuranceBalance}
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
