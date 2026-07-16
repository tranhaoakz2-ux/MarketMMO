import type { ReactNode } from "react";
import Breadcrumb from "./Breadcrumb";
import Footer from "./Footer";
import Header from "./Header";
import Reveal from "./Reveal";

export default function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: title }]} />
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="text-2xl font-black text-ink">{title}</h1>
            {updatedAt && (
              <p className="mt-1 text-xs text-muted">
                Cập nhật lần cuối: {updatedAt}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.05}>
            <div className="prose-legal mt-6 flex flex-col gap-5 rounded-2xl border border-border-c bg-surface p-6 text-sm leading-relaxed text-ink/80 sm:p-8">
              {children}
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
