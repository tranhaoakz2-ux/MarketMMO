import { Award, CheckCircle2, Clock, Flame, Info, Megaphone, TrendingUp, Trophy } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import AuctionBidForm from "@/components/AuctionBidForm";
import AuctionCountdown from "@/components/AuctionCountdown";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { getAuctionDisplayData, getMySellerProducts } from "@/lib/queries";
import { formatVnd } from "@/lib/format";
import { getNextWindowStart } from "@/lib/auction-schedule";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Đã sửa đúng khớp hành vi thật (trước đây ghi sai "20:00 hàng ngày"/lịch
// cố định không tồn tại trong code, và câu "ưu tiên hiển thị & tìm kiếm TOP
// đầu" không đúng — thắng đấu giá CHỈ ảnh hưởng carousel trang chủ, không
// đụng thứ tự danh mục/tìm kiếm).
const benefits = [
  "Hiển thị nổi bật ở carousel Sản phẩm nổi bật trên trang chủ, đúng 1 tuần (tới phiên Chủ Nhật kế tiếp).",
  "Tiếp cận hàng ngàn khách hàng tiềm năng mỗi ngày.",
  "Tăng uy tín thương hiệu và doanh số bán hàng.",
  "1 vị trí = 1 sản phẩm do bạn tự chọn quảng bá.",
];

const guideSteps = [
  "Đảm bảo ví của bạn có đủ số dư — tiền bị KHOÁ khỏi ví ngay khi đặt giá.",
  "Nhập giá đấu ≥ giá sàn. Chỉ nhận đặt giá từ 20:00 đến 22:00 tối Chủ Nhật.",
  "Nâng giá bất kỳ lúc nào trong khung giờ để giữ hạng cao hơn.",
  "22:00 phiên tự chốt: Top N giá cao nhất chờ admin duyệt, còn lại được hoàn tiền ngay.",
];

export default async function AuctionPage() {
  const session = await auth();
  const mySeller = session?.user
    ? await prisma.seller.findUnique({ where: { userId: session.user.id } })
    : null;
  const data = await getAuctionDisplayData(mySeller?.id);
  const myProducts = session?.user ? await getMySellerProducts(session.user.id) : [];

  const countdownTarget = data.isOpenNow
    ? (data.session?.windowEnd ?? data.thisWindow.windowEnd)
    : getNextWindowStart(data.thisWindow.windowStart);

  const topN = data.bids.slice(0, data.setting.slotCount);
  const others = data.bids.slice(data.setting.slotCount);

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
                      <TrendingUp className="h-3.5 w-3.5 text-success" /> Tăng lượt xem
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-brand" /> Bùng nổ doanh thu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border-c shadow-sm">
              <div className="bg-danger px-4 py-2.5 text-center text-sm font-black text-white">
                📅 PHIÊN ĐẤU GIÁ VỊ TRÍ VÀNG — 20:00–22:00 TỐI CHỦ NHẬT HÀNG TUẦN
              </div>
              <div className="flex flex-col items-center gap-2 bg-surface py-6">
                <p className="text-xs font-semibold text-muted">
                  {data.isOpenNow ? "Đang mở nhận giá — kết thúc sau" : "Phiên tiếp theo bắt đầu sau"}
                </p>
                <AuctionCountdown endAt={countdownTarget} />
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                  {data.setting.slotCount} vị trí vàng · Thắng hiển thị đúng 1 tuần
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-surface-alt py-3 text-sm font-bold text-foreground">
              <Clock className="h-4 w-4" />
              {data.isOpenNow
                ? data.bids.length > 0
                  ? "PHIÊN ĐANG DIỄN RA — CÓ NGƯỜI ĐẶT GIÁ"
                  : "PHIÊN ĐANG MỞ — CHỜ LƯỢT ĐẶT GIÁ ĐẦU TIÊN"
                : data.session?.status === "PENDING_REVIEW"
                  ? "PHIÊN TUẦN NÀY ĐÃ CHỐT — ĐANG CHỜ ADMIN DUYỆT"
                  : "NGOÀI GIỜ ĐẤU GIÁ — QUAY LẠI TỐI CHỦ NHẬT"}
            </div>
          </Reveal>

          {data.bids.length > 0 && (
            <Reveal delay={0.1}>
              <div className="mt-6 overflow-hidden rounded-xl border border-border-c">
                <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-black text-ink">
                  <Trophy className="h-4 w-4" /> BẢNG XẾP HẠNG PHIÊN NÀY
                </div>
                <div className="flex flex-col divide-y divide-border-c bg-surface">
                  {topN.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{b.productName}</p>
                        <p className="truncate text-xs text-muted">{b.sellerName}</p>
                      </div>
                      <span className="shrink-0 text-sm font-black tabular-nums text-brand-dark">{formatVnd(b.amount)}</span>
                    </div>
                  ))}
                  {others.length > 0 && (
                    <div className="bg-surface-alt px-4 py-2 text-[11px] font-semibold text-muted">
                      Ngoài Top {data.setting.slotCount} — chưa đủ hạng thắng
                    </div>
                  )}
                  {others.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 opacity-70">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-alt text-xs font-bold text-muted">
                        {topN.length + i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{b.productName}</p>
                        <p className="truncate text-xs text-muted">{b.sellerName}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{formatVnd(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <div className="mt-6 max-w-md rounded-xl border border-border-c bg-surface p-4 shadow-sm">
              <p className="mb-3 text-sm font-black text-foreground">Đặt giá đấu</p>
              <AuctionBidForm
                isOpenNow={data.isOpenNow}
                floorPrice={data.setting.floorPrice}
                myProducts={myProducts.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
                isSeller={Boolean(mySeller)}
                myBid={
                  data.myBid
                    ? { id: data.myBid.id, amount: data.myBid.amount, productSlug: data.myBid.productSlug, status: data.myBid.status }
                    : null
                }
              />
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
