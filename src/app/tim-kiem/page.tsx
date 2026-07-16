import { SearchX } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { searchProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchProducts(query) : [];

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Trang chủ", href: "/" }, { label: "Kết quả tìm kiếm" }]}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-1 text-2xl font-black text-ink">
              {query ? (
                <>
                  Kết quả tìm kiếm cho &quot;<span className="text-brand-dark">{query}</span>
                  &quot;
                </>
              ) : (
                "Tìm kiếm sản phẩm"
              )}
            </h1>
            <p className="mb-6 text-sm text-muted">
              {query
                ? `Tìm thấy ${results.length} sản phẩm phù hợp.`
                : "Nhập từ khoá vào ô tìm kiếm trên đầu trang để bắt đầu."}
            </p>
          </Reveal>

          {query && results.length === 0 && (
            <Reveal>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-c bg-surface p-12 text-center">
                <SearchX className="h-10 w-10 text-muted" strokeWidth={1.5} />
                <p className="text-sm text-muted">
                  Không tìm thấy sản phẩm hoặc người bán nào khớp với &quot;{query}&quot;.
                  Thử một từ khoá khác hoặc ngắn hơn.
                </p>
              </div>
            </Reveal>
          )}

          {results.length > 0 && (
            <Reveal delay={0.05}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Tìm kiếm — MarketMMO",
};
