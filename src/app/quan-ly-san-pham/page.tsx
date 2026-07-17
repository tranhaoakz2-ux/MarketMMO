import { Layers } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductVariantManager from "@/components/ProductVariantManager";
import Reveal from "@/components/Reveal";

export default function ManageProductsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Trang chủ", href: "/" }, { label: "Quản lý sản phẩm" }]}
          />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-ink px-6 py-5 text-white">
              <Layers className="h-6 w-6 text-brand" />
              <div>
                <h1 className="text-lg font-black">Quản lý sản phẩm &amp; phiên bản</h1>
                <p className="text-xs text-white/60">
                  Thêm các gói/phiên bản (VD: theo quốc gia, năm tạo, thời hạn thuê...) để
                  người mua lựa chọn trước khi thanh toán.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <ProductVariantManager />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Quản lý sản phẩm — MarketMMO",
};
