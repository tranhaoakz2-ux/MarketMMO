import { BadgeCheck, Package, Store, UserPlus } from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RatingStars from "@/components/RatingStars";
import Reveal from "@/components/Reveal";
import { getAllSellersWithStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SellerDirectoryPage() {
  const sellers = await getAllSellersWithStats();

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Người bán" }]} />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
                  <Store className="h-5 w-5 text-brand-dark" /> Người bán trên
                  MarketMMO
                </h1>
                <p className="mt-1 text-sm text-muted">
                  {sellers.length} gian hàng đang hoạt động — độ uy tín được
                  đánh giá 1-5 sao trực tiếp bởi người mua đã giao dịch.
                </p>
              </div>
              <Link
                href="/tro-thanh-nguoi-ban"
                className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-black text-ink transition hover:bg-brand-dark"
              >
                <UserPlus className="h-3.5 w-3.5" /> Trở thành người bán
              </Link>
            </div>
          </Reveal>

          {sellers.length === 0 ? (
            <Reveal>
              <div className="rounded-xl border border-dashed border-border-c bg-surface p-12 text-center text-sm text-muted">
                Chưa có gian hàng nào trên hệ thống.
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.05}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sellers.map((seller) => (
                  <Link
                    key={seller.id}
                    href={`/shop/${seller.slug}`}
                    className="flex flex-col gap-3 rounded-2xl border border-border-c bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand text-xl shadow">
                        <Store className="h-7 w-7 text-ink" />
                        {seller.verified && (
                          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-success text-white ring-2 ring-surface">
                            <BadgeCheck className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {seller.shopName}
                        </p>
                        <span className="mt-0.5 inline-block rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-brand">
                          Level {seller.level}
                        </span>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-xs text-muted">
                      {seller.description}
                    </p>

                    <div className="mt-auto flex items-center justify-between border-t border-border-c pt-3 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Package className="h-3.5 w-3.5" /> {seller.productCount} sản phẩm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <RatingStars rating={seller.avgRating} />
                        <span className="font-bold text-foreground">
                          {seller.reviewCount > 0 ? seller.avgRating.toFixed(1) : "—"}
                        </span>
                        <span className="text-muted">({seller.reviewCount})</span>
                      </span>
                    </div>
                  </Link>
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
  title: "Người bán — MarketMMO",
};
