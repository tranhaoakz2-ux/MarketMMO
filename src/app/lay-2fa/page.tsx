import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ToolsPanel from "@/components/ToolsPanel";

export default function Get2faPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[820px] px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Lấy 2FA" }]} />
        </div>

        <Reveal>
          <ToolsPanel />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Bộ Công Cụ Tiện Ích — MarketMMO",
};
