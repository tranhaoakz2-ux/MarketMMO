import { ListFilter } from "lucide-react";
import CategoryTabs from "@/components/CategoryTabs";
import FeaturedProductsPanel from "@/components/FeaturedProductsPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import PromoBanner from "@/components/PromoBanner";
import Reveal from "@/components/Reveal";
import SellerFeaturedPanel from "@/components/SellerFeaturedPanel";
import TagCloud from "@/components/TagCloud";
import {
  getAllCategories,
  getAllProducts,
  getAllSellersWithStats,
  getAuctionSlots,
  getFeaturedProducts,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 36;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const [categories, products, featured, auctionSlots, sellers] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
    getFeaturedProducts(),
    getAuctionSlots(),
    getAllSellersWithStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = products.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const categoriesWithCount = categories.map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    count: products.filter((p) => p.categorySlug === cat.slug).length,
  }));

  const nextAuctionEndAt = auctionSlots.length
    ? auctionSlots.reduce((soonest, s) =>
        s.endAt < soonest.endAt ? s : soonest
      ).endAt
    : null;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <Reveal>
            <PromoBanner />
          </Reveal>

          <Reveal delay={0.05}>
            <FeaturedProductsPanel items={featured} nextAuctionEndAt={nextAuctionEndAt} />
          </Reveal>

          <Reveal delay={0.05}>
            <SellerFeaturedPanel items={sellers} />
          </Reveal>

          <Reveal delay={0.05}>
            <CategoryTabs categories={categoriesWithCount} />
          </Reveal>

          <Reveal delay={0.1}>
            <div
              id="danh-sach-san-pham"
              className="scroll-mt-[190px] overflow-hidden rounded-[15px] bg-brand shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-[25px] sm:py-[15px]">
                <h2 className="flex items-center gap-2 whitespace-nowrap text-sm font-black text-ink sm:text-xl">
                  <ListFilter className="h-4 w-4 sm:h-5 sm:w-5" /> DANH SÁCH SẢN PHẨM
                </h2>
                <span className="whitespace-nowrap text-[11px] font-bold text-ink sm:text-[13px]">
                  Tìm thấy {products.length} sản phẩm
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Pagination
              basePath="/"
              currentPage={safePage}
              totalCount={products.length}
              pageSize={PAGE_SIZE}
            />
          </Reveal>

          <Reveal delay={0.1}>
            <TagCloud />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
