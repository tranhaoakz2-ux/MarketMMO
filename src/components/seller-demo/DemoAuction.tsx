import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Gavel,
  Info,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Card,
  PageHeader,
  SectionTitle,
  Select,
  StatusBadge,
  TextInput,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import { AUCTION_SLOTS, MY_PRODUCT_OPTIONS } from "@/components/seller-demo/mock";

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

function ScheduleCard({ title, when, countdown, badge }: { title: string; when: string; countdown: string; badge: string }) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-center">
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="text-[11px] text-ink/70">{when}</p>
      </div>
      <div className="flex flex-col items-center gap-2 py-6">
        <p className="font-mono text-2xl font-black tabular-nums text-foreground">{countdown}</p>
        <StatusBadge tone="success">{badge}</StatusBadge>
      </div>
    </Card>
  );
}

export default function DemoAuction() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quảng bá (Đấu giá)"
        subtitle="Đấu giá giành vị trí vàng để sản phẩm của bạn hiển thị nổi bật trên trang chủ."
        actions={<StatusBadge tone="warn" dot>Phiên đang diễn ra</StatusBadge>}
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
          <ScheduleCard title="📅 PHIÊN NGÀY (VỊ TRÍ 5 & 6)" when="20:00 hàng ngày" countdown="03:47:20" badge="Hiển thị trọn 1 ngày" />
          <ScheduleCard title="📅 PHIÊN TUẦN (VỊ TRÍ 1-4)" when="Chủ nhật 20:00" countdown="2 ngày 04:12" badge="Hiển thị trọn 1 tuần" />
        </div>
      </div>

      {/* 6 slot */}
      <div>
        <SectionTitle aside={<span className="text-[11px] text-muted">6 vị trí</span>}>Các vị trí đang mở</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AUCTION_SLOTS.map((slot) => (
            <Card key={slot.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <StatusBadge tone="brand">Vị trí #{slot.position}</StatusBadge>
                <span className="text-xs font-semibold text-muted">
                  {slot.period === "WEEKLY" ? "Đấu giá tuần" : "Đấu giá ngày"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-brand-dark" />
                <span className="font-mono tabular-nums">{slot.countdown}</span>
              </div>

              <div className="rounded-xl bg-surface-alt p-3 text-xs">
                {slot.topBid ? (
                  <>
                    <p className="font-black tabular-nums text-foreground">
                      {formatVndDemo(slot.topBid.amount)}{" "}
                      <span className="font-normal text-muted">({slot.bidCount} lượt đấu)</span>
                    </p>
                    <p className="mt-0.5 truncate text-muted">
                      {slot.topBid.productName} — {slot.topBid.sellerName}
                    </p>
                  </>
                ) : (
                  <p className="text-muted">
                    Chưa có lượt đấu · Giá sàn{" "}
                    <b className="tabular-nums text-foreground">{formatVndDemo(slot.floorPrice)}</b>
                  </p>
                )}
              </div>

              {/* Form đặt giá */}
              <div className="flex flex-col gap-2">
                <Select defaultValue={MY_PRODUCT_OPTIONS[0]?.id}>
                  {MY_PRODUCT_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name.length > 40 ? p.name.slice(0, 40) + "…" : p.name}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <TextInput
                    type="number"
                    placeholder={`≥ ${formatVndDemo(Math.max(slot.floorPrice, (slot.topBid?.amount ?? 0) + 1000))}`}
                  />
                  <Button className="shrink-0"><Gavel className="h-3.5 w-3.5" /> Đặt giá</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
