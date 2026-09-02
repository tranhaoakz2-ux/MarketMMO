import { SearchX } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { searchProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

// Trước đây trang này KHÔNG có phân trang ở bất kỳ tầng nào (DB trả hết, UI
// render hết bằng .map()) — vấn đề nghiêm trọng nhất trong
// PERFORMANCE_AUDIT.md mục 1. Giờ dùng đúng mẫu phân trang server-side đã có
// sẵn ở /danh-muc (searchParams `page`, component Pagination dùng chung).
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = (q ?? "").trim();
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const { items: results, total } = query
    ? await searchProducts(query, { page: currentPage, pageSize: PAGE_SIZE })
    : { items: [], total: 0 };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Trang chủ", href: "/" }, { label: "Kết quả tìm kiếm" }]}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 id="ket-qua-tim-kiem" className="mb-1 scroll-mt-24 text-2xl font-black text-foreground">
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
                ? `Tìm thấy ${total} sản phẩm phù hợp.`
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
            <>
              <Reveal delay={0.05}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-6">
                  <Pagination
                    basePath="/tim-kiem"
                    currentPage={currentPage}
                    totalCount={total}
                    pageSize={PAGE_SIZE}
                    sectionId="ket-qua-tim-kiem"
                    extraParams={{ q: query }}
                  />
                </div>
              </Reveal>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Tìm kiếm — MaketMMO",
};
