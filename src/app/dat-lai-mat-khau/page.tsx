import { KeyRound } from "lucide-react";
import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "/" },
              { label: "Đăng nhập", href: "/dang-nhap" },
              { label: "Đặt lại mật khẩu" },
            ]}
          />
          <Reveal>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
              <div className="flex items-center justify-center gap-2 bg-brand py-4 text-sm font-black text-ink">
                <KeyRound className="h-4 w-4" /> Đặt lại mật khẩu
              </div>
              <div className="p-6 sm:p-8">
                <Suspense fallback={<p className="text-sm text-muted">Đang tải...</p>}>
                  <ResetPasswordForm />
                </Suspense>
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
  title: "Đặt lại mật khẩu — MarketMMO",
};
