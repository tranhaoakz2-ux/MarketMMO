import { ListFilter } from "lucide-react";
import CategoryTabs from "@/components/CategoryTabs";
import FeaturedProductsPanel from "@/components/FeaturedProductsPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import HomeHeroBanner from "@/components/HomeHeroBanner";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import SellerFeaturedPanel from "@/components/SellerFeaturedPanel";
import TagCloud from "@/components/TagCloud";
import WelcomeModal from "@/components/WelcomeModal";
import {
  getAllProducts,
  getCategoryTree,
  getFeaturedProducts,
  getFeaturedSellers,
  getProductCountByCategory,
} from "@/lib/queries";
import { parseProductSortKey } from "@/lib/product-sort";
import { getSearchTags } from "@/lib/site-config";
import { getAuctionWindowFor, getNextWindowStart, isWithinAuctionWindow } from "@/lib/auction-schedule";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 36;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { page, sort } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const sortKey = parseProductSortKey(sort);

  // TRƯỚC ĐÂY: getAllProducts() tải TOÀN BỘ sản phẩm APPROVED trên sàn, sắp
  // xếp lần 2 bằng sortProducts() ở đây (product-sort.ts), rồi mới cắt trang
  // trong bộ nhớ — 2 tầng sắp xếp chồng nhau + không phân trang ở DB (xem
  // PERFORMANCE_AUDIT.md mục 1). Giờ getAllProducts() tự sắp ĐÚNG 1 lần theo
  // `sortKey` (ProductSortKey là tập con hợp lệ của ListingSortKey mà hàm
  // này nhận — "newest"/"price_asc"/"price_desc" cùng ý nghĩa ở cả 2 nơi) và
  // cắt trang thật ở DB — sortProducts()/product-sort.ts KHÔNG đổi gì (vẫn
  // dùng cho CategoryTabs.tsx), chỉ trang này không gọi lại nữa vì dư thừa.
  //
  // countBySlug (số sản phẩm theo từng category cho CategoryTabs) TRƯỚC ĐÂY
  // đếm bằng cách duyệt qua TOÀN BỘ `products` đã tải — giờ getAllProducts()
  // chỉ trả 1 trang nên phải đếm riêng ở DB (getProductCountByCategory()).
  const [{ items: pagedProducts, total }, countBySlug, featured, sellers, categoryTree, searchTags] =
    await Promise.all([
      getAllProducts({ sort: sortKey, page: currentPage, pageSize: PAGE_SIZE }),
      getProductCountByCategory(),
      getFeaturedProducts(),
      getFeaturedSellers(),
      getCategoryTree(),
      getSearchTags(),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Đếm ngược đấu giá vị trí vàng — đúng khớp lịch cố định 20:00–22:00 tối
  // Chủ Nhật (xem src/lib/auction-schedule.ts): đang mở thì đếm tới lúc
  // đóng, ngoài giờ thì đếm tới lúc phiên KẾ TIẾP bắt đầu.
  const auctionOpenNow = isWithinAuctionWindow();
  const auctionWindow = getAuctionWindowFor();
  const auctionCountdownAt = auctionOpenNow ? auctionWindow.windowEnd : getNextWindowStart(auctionWindow.windowStart);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <h1 className="sr-only">MaketMMO — Sàn giao dịch tài khoản, vật phẩm & dịch vụ MMO uy tín</h1>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <Reveal>
            <HomeHeroBanner />
          </Reveal>

          <Reveal delay={0.05}>
            <FeaturedProductsPanel items={featured} auctionCountdownAt={auctionCountdownAt} auctionOpenNow={auctionOpenNow} />
          </Reveal>

          <Reveal delay={0.05}>
            <SellerFeaturedPanel items={sellers} />
          </Reveal>

          <Reveal delay={0.05}>
            <CategoryTabs tree={categoryTree} countBySlug={countBySlug} sort={sortKey ?? "default"} />
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
                  Tìm thấy {total} sản phẩm
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
              totalCount={total}
              pageSize={PAGE_SIZE}
              sort={sort}
            />
          </Reveal>

          {searchTags.length > 0 && (
            <Reveal delay={0.1}>
              <TagCloud tags={searchTags} />
            </Reveal>
          )}
        </div>
      </main>
      <Footer />
      <WelcomeModal />
    </>
  );
}
