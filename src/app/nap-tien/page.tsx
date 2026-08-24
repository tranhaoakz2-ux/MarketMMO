import Breadcrumb from "@/components/Breadcrumb";
import DepositPanel from "@/components/DepositPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getBankInfo, getUsdtInfo } from "@/lib/payment/deposit";
import { getDvnetConfig, getUsdtProvider } from "@/lib/payment/dvnet";
import { getUsdtDepositRate } from "@/lib/payment/exchange-rate";
import { isSepayConfigured } from "@/lib/payment/sepay";
import { isVnpayConfigured } from "@/lib/payment/vnpay";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export default async function DepositPage() {
  const [vnpayEnabled, bankInfo, usdtInfoRaw, sepayEnabled, usdtProvider, dvnetConfig] = await Promise.all([
    isVnpayConfigured(),
    getBankInfo(),
    getUsdtInfo(),
    isSepayConfigured(),
    getUsdtProvider(),
    getDvnetConfig(),
  ]);
  // Số hiển thị "1 USDT ≈ Xđ" PHẢI là tỷ giá ĐÃ áp biên sàn — cùng hàm
  // getUsdtDepositRate() với chỗ tính số USDT buyer bắt buộc phải chuyển
  // (POST /api/wallet/deposit-usdt/intent), tránh lệch số hiển thị/tính tiền
  // như tỷ giá USDT trước đây. getUsdtInfo() chỉ còn dùng để lấy địa chỉ ví +
  // xác định tính năng có bật hay không (rate tĩnh của nó không dùng để hiện
  // nữa). getUsdtDepositRate() gọi CoinGecko (network) — lỗi ở đây KHÔNG được
  // làm sập cả trang nạp tiền (VNPay/bank vẫn phải hiện được), nên tạm ẩn mỗi
  // ô USDT nếu tính lỗi, người dùng vẫn dùng được 2 phương thức còn lại. Cần
  // tính rate dù đang dùng provider nào (DV.net cũng hiện "1 USDT ≈ Xđ" ước
  // tính bằng cùng hàm này, xem POST /api/wallet/deposit-dvnet).
  let usdtRate: number | null = null;
  try {
    ({ rate: usdtRate } = await getUsdtDepositRate());
  } catch {
    usdtRate = null;
  }
  const usdtInfo = usdtInfoRaw && usdtRate !== null ? { ...usdtInfoRaw, rate: usdtRate } : null;
  // "Bật" USDT tab: provider trongrid cần usdtInfo (địa chỉ ví + rate) như cũ;
  // provider dvnet cần dvnetConfig (api key + webhook secret) + rate — không
  // cần usdt_trc20_address (DV.net tự sinh địa chỉ riêng từng lượt nạp).
  const usdtEnabled = usdtProvider === "dvnet" ? !!dvnetConfig && usdtRate !== null : !!usdtInfo;
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="sr-only">Nạp tiền vào ví MaketMMO</h1>
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Nạp tiền" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <DepositPanel
              vnpayEnabled={vnpayEnabled}
              bankInfo={bankInfo}
              usdtInfo={usdtInfo}
              usdtEnabled={usdtEnabled}
              usdtProvider={usdtProvider}
              sepayEnabled={sepayEnabled}
            />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nạp tiền — MaketMMO",
  robots: PRIVATE_ROBOTS,
};
