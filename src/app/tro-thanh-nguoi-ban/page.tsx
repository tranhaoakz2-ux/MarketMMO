import { Store } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import SellerRegisterForm from "@/components/SellerRegisterForm";

export default function BecomeSellerPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Trang chủ", href: "/" }, { label: "Đăng ký bán hàng" }]}
          />
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl bg-surface shadow-[0_20px_50px_-12px_rgba(255,199,0,0.25)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-light/50 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-10 top-16 h-28 w-28 rounded-full bg-brand-light/40 blur-2xl"
              />

              <div className="relative flex items-center gap-4 bg-brand px-6 py-7 sm:px-8">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink">
                  <Store className="h-6 w-6 text-brand" />
                </span>
                <div>
                  <h1 className="text-2xl font-black text-ink sm:text-[28px]">
                    Đăng ký trở thành người bán
                  </h1>
                  <p className="mt-1 text-[15px] font-medium text-ink/70">
                    Hoàn thành thông tin để bắt đầu bán hàng trên nền tảng của chúng tôi
                  </p>
                </div>
              </div>

              <div className="relative bg-surface p-6 sm:p-8">
                <SellerRegisterForm />
              </div>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Đăng ký bán hàng — MarketMMO",
};
