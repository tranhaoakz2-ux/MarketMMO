import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import AuctionBidForm from "@/components/AuctionBidForm";
import AuctionCountdown from "@/components/AuctionCountdown";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { getAuctionSlots, getMySellerProducts } from "@/lib/queries";
import { formatVnd } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const benefits = [
  "Hiển thị nổi bật ngay trang chủ. Vị trí 1-4 hiển thị trong 01 tuần. Vị trí 5-6 (Đấu giá ngày) hiển thị trong 01 ngày.",
  "Tiếp cận hàng ngàn khách hàng tiềm năng mỗi ngày.",
  "Tăng uy tín thương hiệu và doanh số bán hàng.",
  "Sản phẩm được ưu tiên hiển thị & tìm kiếm TOP đầu.",
  "01 vị trí = 01 sản phẩm do bạn tự chọn quảng bá.",
];

const guideSteps = [
  "Đảm bảo ví của bạn có đủ số dư trước khi đặt giá.",
  "Nhập giá đấu ≥ giá sàn. Mọi người cạnh tranh công bằng, minh bạch.",
  "Giữ giá cao nhất đến khi phiên kết thúc để chiến thắng.",
  "Sản phẩm chiến thắng tự động hiển thị tại Vị trí Vàng trên trang chủ khi phiên kết thúc.",
];

export default async function AuctionPage() {
  const session = await auth();
  const slots = await getAuctionSlots();
  const myProducts = session?.user
    ? await getMySellerProducts(session.user.id)
    : [];
  const mySeller = session?.user
    ? await prisma.seller.findUnique({ where: { userId: session.user.id } })
    : null;

  const weeklySlots = slots.filter((s) => s.period === "WEEKLY").sort((a, b) => a.position - b.position);
  const dailySlots = slots.filter((s) => s.period === "DAILY").sort((a, b) => a.position - b.position);
  const nearestWeekly = weeklySlots[0];
  const nearestDaily = dailySlots[0];
  const hasAnyBid = slots.some((s) => s.bidCount > 0);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Đấu giá" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-r from-ink via-ink-soft to-ink p-5 shadow-sm sm:p-6">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-brand bg-black">
                  <Flame className="h-7 w-7 text-danger" />
                  <span className="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-bold text-white">
                    HOT
                  </span>
                </span>
                <div>
                  <h1 className="bg-gradient-to-r from-brand via-brand-light to-brand bg-clip-text text-lg font-black uppercase tracking-wide text-transparent sm:text-xl">
                    Đấu giá giành vị trí vàng hiển thị sản phẩm nổi bật
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60 sm:justify-start">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-success" /> Tăng
                      lượt xem
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-brand" /> Bùng nổ
                      doanh thu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="mt-8 mb-4 text-center text-lg font-black uppercase tracking-wide text-foreground">
              Lịch đấu giá sắp tới
              <span className="mx-auto mt-1.5 block h-1 w-16 rounded-full bg-brand" />
            </h2>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-border-c shadow-sm">
                <div className="bg-ink px-4 py-2.5 text-center text-sm font-black text-white">
                  📅 PHIÊN NGÀY (VỊ TRÍ 5 &amp; 6)
                </div>
                <div className="flex flex-col items-center gap-2 bg-surface py-6">
                  <p className="text-xs font-semibold text-muted">
                    Diễn ra lúc 20:00 hàng ngày
                  </p>
                  {nearestDaily ? (
                    <AuctionCountdown endAt={nearestDaily.endAt} />
                  ) : (
                    <span className="text-sm text-muted">Chưa có phiên nào</span>
                  )}
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    Hiển thị trọn 1 ngày
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border-c shadow-sm">
                <div className="bg-danger px-4 py-2.5 text-center text-sm font-black text-white">
                  📅 PHIÊN TUẦN (VỊ TRÍ 1-4)
                </div>
                <div className="flex flex-col items-center gap-2 bg-surface py-6">
                  <p className="text-xs font-semibold text-muted">
                    Chủ nhật hàng tuần lúc 20:00
                  </p>
                  {nearestWeekly ? (
                    <AuctionCountdown endAt={nearestWeekly.endAt} />
                  ) : (
                    <span className="text-sm text-muted">Chưa có phiên nào</span>
                  )}
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    Hiển thị trọn 1 tuần
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-6 text-center text-sm font-semibold text-foreground">
              🏆 Hãy chuẩn bị sẵn sàng để chiếm vị trí TOP 1!
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-surface-alt py-3 text-sm font-bold text-foreground">
              <Clock className="h-4 w-4" />
              {hasAnyBid ? "PHIÊN ĐANG DIỄN RA — CÓ NGƯỜI ĐẶT GIÁ" : "ĐANG CHỜ LƯỢT ĐẤU GIÁ ĐẦU TIÊN"}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-black text-ink">
                      Vị trí #{slot.position}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {slot.period === "WEEKLY" ? "Đấu giá tuần" : "Đấu giá ngày"}
                    </span>
                  </div>

                  <AuctionCountdown endAt={slot.endAt} size="sm" />

                  <div className="rounded-lg bg-surface-alt p-2.5 text-xs">
                    {slot.topBid ? (
                      <>
                        <p className="font-bold text-foreground">
                          {formatVnd(slot.topBid.amount)}{" "}
                          <span className="font-normal text-muted">
                            ({slot.bidCount} lượt đấu)
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-muted">
                          {slot.topBid.productName} — {slot.topBid.sellerName}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted">
                        Chưa có lượt đấu giá · Giá sàn {formatVnd(slot.floorPrice)}
                      </p>
                    )}
                  </div>

                  <AuctionBidForm
                    slotId={slot.id}
                    minAmount={Math.max(slot.floorPrice, (slot.topBid?.amount ?? 0) + 1000)}
                    myProducts={myProducts.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
                    isSeller={Boolean(mySeller)}
                  />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border-c shadow-sm">
                <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-black text-ink">
                  <Megaphone className="h-4 w-4" /> ĐƯA SẢN PHẨM LÊN VỊ TRÍ VÀNG
                </div>
                <ul className="flex flex-col gap-2 bg-surface p-4 text-sm text-foreground/80">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-xl border border-border-c shadow-sm">
                <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-black text-ink">
                  <Info className="h-4 w-4" /> HƯỚNG DẪN THAM GIA
                </div>
                <ul className="flex flex-col gap-3 bg-surface p-4 text-sm text-foreground/80">
                  {guideSteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
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
  title: "Đấu giá vị trí vàng — MarketMMO",
};
