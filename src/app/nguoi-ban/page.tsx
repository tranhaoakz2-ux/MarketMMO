import { Store, UserPlus } from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import SellerDirectory, { type SellerCardData } from "@/components/SellerDirectory";
import { getAllSellersWithStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SellerDirectoryPage() {
  const sellers = await getAllSellersWithStats();

  // Format 1 lần ở server (Date -> string/number đơn giản) để component
  // client bên dưới không phải tự tính lại hay nhận thẳng đối tượng Date.
  const cards: SellerCardData[] = sellers.map((s) => ({
    id: s.id,
    shopName: s.shopName,
    slug: s.slug,
    description: s.description,
    level: s.level,
    levelBadge: s.levelBadge,
    verified: s.verified,
    avatarUrl: s.avatarUrl,
    coverUrl: s.coverUrl,
    productCount: s.productCount,
    avgRating: s.avgRating,
    reviewCount: s.reviewCount,
    insuranceBalance: s.insuranceBalance,
    joinedLabel: `Tham gia từ ${String(s.createdAt.getMonth() + 1).padStart(2, "0")}/${s.createdAt.getFullYear()}`,
    createdAtMs: s.createdAt.getTime(),
  }));

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Người bán" }]} />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
                  <Store className="h-5 w-5 text-brand-dark" /> Người bán trên
                  MaketMMO
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

          {cards.length === 0 ? (
            <Reveal>
              <div className="rounded-xl border border-dashed border-border-c bg-surface p-12 text-center text-sm text-muted">
                Chưa có gian hàng nào trên hệ thống.
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.05}>
              <SellerDirectory sellers={cards} />
            </Reveal>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Người bán — MaketMMO",
};
