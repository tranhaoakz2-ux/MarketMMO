import Breadcrumb from "@/components/Breadcrumb";
import DepositPanel from "@/components/DepositPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getBankInfo, getUsdtInfo } from "@/lib/payment/deposit";
import { isSepayConfigured } from "@/lib/payment/sepay";
import { isVnpayConfigured } from "@/lib/payment/vnpay";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export default async function DepositPage() {
  const [vnpayEnabled, bankInfo, usdtInfo, sepayEnabled] = await Promise.all([
    isVnpayConfigured(),
    getBankInfo(),
    getUsdtInfo(),
    isSepayConfigured(),
  ]);
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="sr-only">Nạp tiền vào ví MarketMMO</h1>
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Nạp tiền" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <DepositPanel vnpayEnabled={vnpayEnabled} bankInfo={bankInfo} usdtInfo={usdtInfo} sepayEnabled={sepayEnabled} />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nạp tiền — MarketMMO",
  robots: PRIVATE_ROBOTS,
};
