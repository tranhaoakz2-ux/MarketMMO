import Breadcrumb from "@/components/Breadcrumb";
import DepositPanel from "@/components/DepositPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getBankInfo, getUsdtInfo } from "@/lib/payment/deposit";
import { isVnpayConfigured } from "@/lib/payment/vnpay";

export default function DepositPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Nạp tiền" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <DepositPanel
              vnpayEnabled={isVnpayConfigured()}
              bankInfo={getBankInfo()}
              usdtInfo={getUsdtInfo()}
            />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Nạp tiền — MarketMMO",
};
