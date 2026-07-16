import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import AdminDashboard from "@/components/AdminDashboard";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Quản trị" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-1 flex items-center gap-2 text-xl font-black text-ink">
              <ShieldAlert className="h-5 w-5 text-brand-dark" /> Bảng điều
              khiển quản trị
            </h1>
            <p className="mb-6 text-sm text-muted">
              Duyệt yêu cầu nạp tiền thủ công và giải ngân ký quỹ cho người
              bán.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <AdminDashboard />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Quản trị — MarketMMO",
};
