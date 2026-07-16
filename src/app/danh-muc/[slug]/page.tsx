import { Info, ListFilter } from "lucide-react";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import CategoryProductCard from "@/components/CategoryProductCard";
import CategorySidebar from "@/components/CategorySidebar";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import Reveal from "@/components/Reveal";
import { getRecentForumPosts } from "@/lib/forum";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getAllCategories, getProductsByCategory } from "@/lib/queries";

export const dynamic = "force-dynamic";

const sortOptions = ["Mới nhất", "Bán chạy", "Giá ↑", "Giá ↓"];
const PAGE_SIZE = 24;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const categories = await getAllCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const CategoryIcon = getCategoryIcon(slug);
  const items = await getProductsByCategory(slug);
  const recentPosts = await getRecentForumPosts(6);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: "Trang chủ", href: "/" }, { label: category.name }]}
          />
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-12 sm:px-6 lg:flex-row lg:px-8">
          <Reveal direction="right" className="lg:sticky lg:top-24 lg:self-start">
            <CategorySidebar activeSlug={slug} categories={categories} posts={recentPosts} />
          </Reveal>

          <div className="min-w-0 flex-1">
            <Reveal>
              <h1 className="mb-4 flex items-center gap-2 text-2xl font-black text-ink">
                <CategoryIcon className="h-6 w-6 text-brand-dark" strokeWidth={1.75} />
                {category.name}
              </h1>
            </Reveal>

            <Reveal delay={0.05}>
              <div
                id="danh-sach-san-pham"
                className="mb-4 scroll-mt-[190px] overflow-hidden rounded-[15px] bg-brand shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-[25px] sm:py-[15px]">
                  <h2 className="flex items-center gap-2 whitespace-nowrap text-sm font-black text-ink sm:text-xl">
                    <ListFilter className="h-4 w-4 sm:h-5 sm:w-5" /> DANH SÁCH SẢN PHẨM
                  </h2>
                  <span className="whitespace-nowrap text-[11px] font-bold text-ink sm:text-[13px]">
                    Tìm thấy {items.length} sản phẩm
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mb-4 flex items-center gap-6 border-b border-border-c">
                {sortOptions.map((option, i) => (
                  <button
                    key={option}
                    className={`-mb-px cursor-pointer border-b-2 pb-3 text-[15px] font-semibold transition ${
                      i === 0
                        ? "border-brand text-brand-dark"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-dark/30 bg-brand-light/40 px-4 py-3 text-sm">
                <Info className="h-4 w-4 shrink-0 text-brand-dark" />
                <p className="font-semibold text-brand-dark">
                  Sản phẩm không trùng cam kết bán ra 1 lần duy nhất trên hệ thống.
                </p>
              </div>
            </Reveal>

            {items.length === 0 ? (
              <Reveal>
                <div className="rounded-xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
                  Chưa có sản phẩm nào trong danh mục này.
                </div>
              </Reveal>
            ) : (
              <Reveal delay={0.1}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {pagedItems.map((product) => (
                    <CategoryProductCard key={product.id} product={product} />
                  ))}
                </div>
              </Reveal>
            )}

            <Reveal delay={0.1}>
              <div className="mt-6">
                <Pagination
                  basePath={`/danh-muc/${slug}`}
                  currentPage={safePage}
                  totalCount={items.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                <strong className="text-ink">{category.name}</strong> là danh
                mục sản phẩm số được giao dịch phổ biến trên MarketMMO — hỗ trợ
                đầy đủ các phương thức kiếm tiền online. Mọi giao dịch đều
                được ký quỹ an toàn và giao hàng tự động ngay sau khi thanh
                toán.
              </p>
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
