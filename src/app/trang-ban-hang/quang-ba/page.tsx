import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getAuctionSlots, getMySellerProducts } from "@/lib/queries";
import { formatVnd } from "@/lib/format";
import AuctionBidForm from "@/components/AuctionBidForm";
import AuctionCountdown from "@/components/AuctionCountdown";
import {
  Card,
  PageHeader,
  SectionTitle,
  StatusBadge,
} from "@/components/seller-demo/DemoKit";

export const dynamic = "force-dynamic";

const BENEFITS = [
  "Hiển thị nổi bật ngay trang chủ — vị trí 1-4 trong 1 tuần, vị trí 5-6 trong 1 ngày.",
  "Tiếp cận hàng ngàn khách hàng tiềm năng mỗi ngày.",
  "Tăng uy tín thương hiệu & doanh số bán hàng.",
  "1 vị trí = 1 sản phẩm do bạn tự chọn quảng bá.",
];

const GUIDE = [
  "Đảm bảo ví đủ số dư trước khi đặt giá.",
  "Nhập giá đấu ≥ giá sàn — cạnh tranh công bằng, minh bạch.",
  "Giữ giá cao nhất đến khi phiên kết thúc để chiến thắng.",
  "Sản phẩm thắng tự động lên Vị trí Vàng trang chủ.",
];

export default async function SellerPromotionPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const [slots, products] = await Promise.all([
    getAuctionSlots(),
    getMySellerProducts(session!.user!.id),
  ]);

  const myProducts = products.map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  const weekly = slots.filter((s) => s.period === "WEEKLY").sort((a, b) => a.position - b.position);
  const daily = slots.filter((s) => s.period === "DAILY").sort((a, b) => a.position - b.position);
  const nearestWeekly = weekly[0];
  const nearestDaily = daily[0];
  const hasAnyBid = slots.some((s) => s.bidCount > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quảng bá (Đấu giá)"
        subtitle="Đấu giá giành vị trí vàng để sản phẩm của bạn hiển thị nổi bật trên trang chủ."
        actions={
          <StatusBadge tone="warn" dot>
            {hasAnyBid ? "Phiên đang diễn ra" : "Đang chờ lượt đầu tiên"}
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
        <SectionTitle>Lịch đấu giá sắp tới</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="p-0" className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-center">
              <p className="text-sm font-black text-ink">📅 PHIÊN NGÀY (VỊ TRÍ 5 & 6)</p>
              <p className="text-[11px] text-ink/70">20:00 hàng ngày</p>
            </div>
            <div className="flex flex-col items-center gap-2 py-6">
              {nearestDaily ? (
                <AuctionCountdown endAt={nearestDaily.endAt} />
              ) : (
                <span className="text-sm text-muted">Chưa có phiên nào</span>
              )}
              <StatusBadge tone="success">Hiển thị trọn 1 ngày</StatusBadge>
            </div>
          </Card>
          <Card padding="p-0" className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-center">
              <p className="text-sm font-black text-ink">📅 PHIÊN TUẦN (VỊ TRÍ 1-4)</p>
              <p className="text-[11px] text-ink/70">Chủ nhật 20:00</p>
            </div>
            <div className="flex flex-col items-center gap-2 py-6">
              {nearestWeekly ? (
                <AuctionCountdown endAt={nearestWeekly.endAt} />
              ) : (
                <span className="text-sm text-muted">Chưa có phiên nào</span>
              )}
              <StatusBadge tone="success">Hiển thị trọn 1 tuần</StatusBadge>
            </div>
          </Card>
        </div>
      </div>

      {/* Các slot */}
      <div>
        <SectionTitle aside={<span className="text-[11px] text-muted">{slots.length} vị trí</span>}>Các vị trí đang mở</SectionTitle>
        {slots.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-muted">Hiện chưa có phiên đấu giá nào đang mở.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {slots.map((slot) => (
              <Card key={slot.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <StatusBadge tone="brand">Vị trí #{slot.position}</StatusBadge>
                  <span className="text-xs font-semibold text-muted">
                    {slot.period === "WEEKLY" ? "Đấu giá tuần" : "Đấu giá ngày"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Clock className="h-4 w-4 text-brand-dark" />
                  <AuctionCountdown endAt={slot.endAt} size="sm" />
                </div>

                <div className="rounded-xl bg-surface-alt p-3 text-xs">
                  {slot.topBid ? (
                    <>
                      <p className="font-black tabular-nums text-foreground">
                        {formatVnd(slot.topBid.amount)}{" "}
                        <span className="font-normal text-muted">({slot.bidCount} lượt đấu)</span>
                      </p>
                      <p className="mt-0.5 truncate text-muted">
                        {slot.topBid.productName} — {slot.topBid.sellerName}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted">
                      Chưa có lượt đấu · Giá sàn{" "}
                      <b className="tabular-nums text-foreground">{formatVnd(slot.floorPrice)}</b>
                    </p>
                  )}
                </div>

                <AuctionBidForm
                  slotId={slot.id}
                  minAmount={Math.max(slot.floorPrice, (slot.topBid?.amount ?? 0) + 1000)}
                  myProducts={myProducts}
                  isSeller={Boolean(seller)}
                />
              </Card>
            ))}
          </div>
        )}
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
