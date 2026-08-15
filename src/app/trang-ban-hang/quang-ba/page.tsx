import { Award, CheckCircle2, Clock, Flame, Info, Megaphone, TrendingUp, Trophy } from "lucide-react";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getAuctionDisplayData, getMySellerProducts } from "@/lib/queries";
import { formatVnd } from "@/lib/format";
import { getNextWindowStart } from "@/lib/auction-schedule";
import AuctionBidForm from "@/components/AuctionBidForm";
import AuctionCountdown from "@/components/AuctionCountdown";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/seller-demo/DemoKit";

export const dynamic = "force-dynamic";

const BENEFITS = [
  "Hiển thị nổi bật ở carousel Sản phẩm nổi bật trên trang chủ, đúng 1 tuần (tới phiên Chủ Nhật kế tiếp).",
  "Tiếp cận hàng ngàn khách hàng tiềm năng mỗi ngày.",
  "Tăng uy tín thương hiệu & doanh số bán hàng.",
  "1 vị trí = 1 sản phẩm do bạn tự chọn quảng bá.",
];

const GUIDE = [
  "Đảm bảo ví đủ số dư — tiền bị KHOÁ khỏi ví ngay khi đặt giá.",
  "Nhập giá đấu ≥ giá sàn. Chỉ nhận đặt giá từ 20:00 đến 22:00 tối Chủ Nhật.",
  "Nâng giá bất kỳ lúc nào trong khung giờ để giữ hạng cao hơn.",
  "22:00 phiên tự chốt: Top N giá cao nhất chờ admin duyệt, còn lại được hoàn tiền ngay.",
];

export default async function SellerPromotionPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const [data, products] = await Promise.all([
    getAuctionDisplayData(seller?.id),
    getMySellerProducts(session!.user!.id),
  ]);

  const myProducts = products.map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  const countdownTarget = data.isOpenNow
    ? (data.session?.windowEnd ?? data.thisWindow.windowEnd)
    : getNextWindowStart(data.thisWindow.windowStart);
  const topN = data.bids.slice(0, data.setting.slotCount);
  const others = data.bids.slice(data.setting.slotCount);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quảng bá (Đấu giá)"
        subtitle="Đấu giá giành vị trí vàng để sản phẩm của bạn hiển thị nổi bật trên trang chủ."
        actions={
          <StatusBadge tone="warn" dot>
            {data.isOpenNow ? "Phiên đang mở" : "Ngoài giờ đấu giá"}
          </StatusBadge>
        }
      />

      {/* Hero */}
      <Card padding="p-0" className="overflow-hidden border-brand-dark/40">
        <div className="flex flex-col items-center gap-3 bg-gradient-to-r from-brand-light via-brand to-brand-dark p-6 text-center sm:flex-row sm:text-left">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink">
            <Flame className="h-7 w-7 text-danger" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black uppercase tracking-wide text-ink">
              Vị trí vàng — hiển thị sản phẩm nổi bật
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-ink/80 sm:justify-start">
              <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Tăng lượt xem</span>
              <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Bùng nổ doanh thu</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Lịch */}
      <div>
        <SectionTitle>Phiên đấu giá — 20:00–22:00 tối Chủ Nhật hàng tuần</SectionTitle>
        <Card padding="p-0" className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-center">
            <p className="text-sm font-black text-ink">{data.setting.slotCount} vị trí vàng</p>
            <p className="text-[11px] text-ink/70">Thắng hiển thị đúng 1 tuần</p>
          </div>
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-xs font-semibold text-muted">
              {data.isOpenNow ? "Đang mở nhận giá — kết thúc sau" : "Phiên tiếp theo bắt đầu sau"}
            </p>
            <AuctionCountdown endAt={countdownTarget} />
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-alt py-3 text-sm font-bold text-foreground">
        <Clock className="h-4 w-4" />
        {data.isOpenNow
          ? data.bids.length > 0
            ? "PHIÊN ĐANG DIỄN RA — CÓ NGƯỜI ĐẶT GIÁ"
            : "PHIÊN ĐANG MỞ — CHỜ LƯỢT ĐẶT GIÁ ĐẦU TIÊN"
          : data.session?.status === "PENDING_REVIEW"
            ? "PHIÊN TUẦN NÀY ĐÃ CHỐT — ĐANG CHỜ ADMIN DUYỆT"
            : "NGOÀI GIỜ ĐẤU GIÁ — QUAY LẠI TỐI CHỦ NHẬT"}
      </div>

      {/* Bảng xếp hạng */}
      {data.bids.length > 0 && (
        <div>
          <SectionTitle aside={<span className="text-[11px] text-muted">{data.bids.length} lượt đặt giá</span>}>
            Bảng xếp hạng phiên này
          </SectionTitle>
          <Card padding="p-0" className="overflow-hidden">
            <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-black text-ink">
              <Trophy className="h-4 w-4" /> TOP {data.setting.slotCount}
            </div>
            <div className="flex flex-col divide-y divide-border-c">
              {topN.map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 px-4 py-3 ${b.sellerId === seller?.id ? "bg-brand-light/20" : ""}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-ink">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{b.productName}</p>
                    <p className="truncate text-xs text-muted">
                      {b.sellerName}
                      {b.sellerId === seller?.id && <span className="ml-1 font-bold text-brand-dark">(Bạn)</span>}
                    </p>
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
                <div
                  key={b.id}
                  className={`flex items-center gap-3 px-4 py-2.5 opacity-70 ${b.sellerId === seller?.id ? "bg-brand-light/10" : ""}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-alt text-xs font-bold text-muted">
                    {topN.length + i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{b.productName}</p>
                    <p className="truncate text-xs text-muted">
                      {b.sellerName}
                      {b.sellerId === seller?.id && <span className="ml-1 font-bold text-brand-dark">(Bạn)</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{formatVnd(b.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Form đặt giá */}
      <div>
        <SectionTitle>Đặt giá đấu</SectionTitle>
        <Card>
          <AuctionBidForm
            isOpenNow={data.isOpenNow}
            floorPrice={data.setting.floorPrice}
            myProducts={myProducts}
            isSeller={Boolean(seller)}
            myBid={
              data.myBid
                ? { id: data.myBid.id, amount: data.myBid.amount, productSlug: data.myBid.productSlug, status: data.myBid.status }
                : null
            }
          />
        </Card>
      </div>

      {/* Quyền lợi + hướng dẫn */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle aside={<Megaphone className="h-4 w-4 text-brand-dark" />}>Đưa sản phẩm lên vị trí vàng</SectionTitle>
          <ul className="flex flex-col gap-2 text-sm text-foreground/80">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {b}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle aside={<Info className="h-4 w-4 text-brand-dark" />}>Hướng dẫn tham gia</SectionTitle>
          <ul className="flex flex-col gap-3 text-sm text-foreground/80">
            {GUIDE.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export const metadata = { title: "Quảng bá (Đấu giá) — Quản Lý Bán Hàng — MarketMMO" };
