"use client";

import { BarChart3, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, PageHeader, Segmented, SectionTitle } from "@/components/seller-demo/DemoKit";
import SellerOverviewChart from "@/components/SellerOverviewChart";
import { formatVnd } from "@/lib/format";

// Trang DEMO cho riêng biểu đồ "Doanh Số Theo Thời Gian" — KHÔNG phải trang
// demo Tổng quan đầy đủ (đã có sẵn ở /trang-ban-hang/demo-tong-quan). Mục
// đích: cho xem trước hình dạng biểu đồ với dữ liệu mẫu khi sàn chưa có đơn
// hàng thật, không hơn.
//
// KHÁC với quy ước "không import component thật" áp dụng cho các trang demo
// khác trong thư mục này: ở đây CỐ Ý tái dùng thẳng component
// SellerOverviewChart THẬT (component thuần trình bày, chỉ nhận props
// `bars`, không tự fetch dữ liệu) — để hình ảnh xem thử khớp 100% với biểu
// đồ thật trên trang Tổng quan, đúng yêu cầu người dùng. Import này AN TOÀN
// vì SellerOverviewChart không đọc DB/API ở đâu cả; nó chỉ vẽ SVG từ mảng
// `bars` được truyền vào — trang Tổng quan thật vẫn tự truyền dữ liệu thật
// của nó, không liên quan gì tới trang demo này.
//
// 4 KỊCH BẢN mẫu, tự sinh nhãn ngày theo ngày hiện tại (label dạng "d/m",
// đúng format thật trong bucketRevenue() ở src/lib/queries.ts) để lúc nào mở
// lên cũng thấy hợp lý, không bị "demo với ngày tháng cũ".
type ScenarioKey = "7d" | "30d" | "tang" | "dao";

function labelDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function buildScenario(key: ScenarioKey): { bars: { label: string; value: number }[]; note: string } {
  if (key === "7d") {
    // 7 ngày gần nhất — biểu đồ thật hiển thị THEO NGÀY khi khoảng <= 10 ngày
    // (xem bucketRevenue(), src/lib/queries.ts). Có cuối tuần bán chạy hơn
    // cho sinh động, giống hành vi mua sắm thật.
    const daily = [820_000, 650_000, 910_000, 1_240_000, 980_000, 2_150_000, 1_780_000];
    return {
      bars: daily.map((value, i) => ({ label: labelDaysAgo(6 - i), value })),
      note: "Theo ngày",
    };
  }
  if (key === "30d") {
    // 30 ngày — biểu đồ thật GỘP THEO TUẦN khi khoảng > 10 ngày, mỗi cột là
    // tổng doanh số 1 tuần (~5 cột cho 30 ngày). Xu hướng tăng nhẹ theo tuần.
    const weekly = [4_200_000, 5_100_000, 4_800_000, 6_300_000, 5_800_000];
    return {
      bars: weekly.map((value, i) => ({ label: labelDaysAgo((weekly.length - 1 - i) * 7), value })),
      note: "Gộp theo tuần",
    };
  }
  if (key === "tang") {
    // Doanh số tăng dần đều — hình dung lúc gian hàng đang phát triển tốt.
    const rising = [320_000, 410_000, 480_000, 590_000, 710_000, 890_000, 1_050_000, 1_280_000, 1_520_000, 1_890_000];
    return {
      bars: rising.map((value, i) => ({ label: labelDaysAgo(rising.length - 1 - i), value })),
      note: "Theo ngày",
    };
  }
  // Doanh số dao động mạnh — ngày bán chạy xen ngày ế, hình dung gian hàng
  // phụ thuộc nhiều vào flash-sale/quảng cáo theo đợt.
  const volatile = [980_000, 420_000, 1_650_000, 610_000, 1_340_000, 380_000, 1_920_000, 750_000, 1_100_000, 540_000];
  return {
    bars: volatile.map((value, i) => ({ label: labelDaysAgo(volatile.length - 1 - i), value })),
    note: "Theo ngày",
  };
}

const SCENARIOS: { value: ScenarioKey; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "tang", label: "Tăng dần" },
  { value: "dao", label: "Dao động" },
];

export default function DemoRevenueChart() {
  const [scenario, setScenario] = useState<ScenarioKey>("7d");
  const { bars, note } = useMemo(() => buildScenario(scenario), [scenario]);
  const total = useMemo(() => bars.reduce((s, b) => s + b.value, 0), [bars]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demo · Doanh Số Theo Thời Gian"
        subtitle="Xem trước hình dạng biểu đồ thật trên trang Tổng quan với dữ liệu MẪU — sàn chưa có đơn hàng thật nên biểu đồ thật đang trống."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/25 p-3.5 text-xs text-foreground/80">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        <p>
          <b className="text-foreground">Trang xem thử — không phải trang thật.</b> Toàn bộ số liệu bên dưới là dữ
          liệu mẫu tự sinh trong trình duyệt, không lấy từ database và không ảnh hưởng gì tới gian hàng của bạn. Trang
          này nằm ở URL riêng (<code className="rounded bg-surface px-1 py-0.5 font-mono">/trang-ban-hang/demo-doanh-so</code>),
          không có trong menu điều hướng — có thể xoá thư mục{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono">src/app/trang-ban-hang/demo-doanh-so</code> và{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono">
            src/components/seller-demo/DemoRevenueChart.tsx
          </code>{" "}
          bất cứ lúc nào mà không ảnh hưởng tới trang Tổng quan thật.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle aside={<span className="text-[11px] font-semibold text-muted">{note}</span>}>
            Doanh Số Theo Thời Gian
          </SectionTitle>
          <Segmented options={SCENARIOS} value={scenario} onChange={setScenario} />
        </div>
        <p className="-mt-2 mb-4 text-xs text-muted">
          Tổng kỳ này (mẫu): <span className="font-bold text-foreground">{formatVnd(total)}</span>
        </p>
        <SellerOverviewChart bars={bars} />
      </Card>

      <Card>
        <SectionTitle>Ghi chú</SectionTitle>
        <ul className="flex flex-col gap-2 text-xs text-muted">
          <li className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
            Biểu đồ dùng đúng component thật (<code className="rounded bg-surface-alt px-1 py-0.5 font-mono">SellerOverviewChart</code>) —
            hình dạng cột, gradient, tooltip hover đều giống 100% với trang Tổng quan thật.
          </li>
          <li className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
            Kịch bản &quot;30 ngày&quot; gộp theo tuần (5 cột) — đúng hành vi thật khi khoảng ngày lọc vượt quá 10
            ngày (xem <code className="rounded bg-surface-alt px-1 py-0.5 font-mono">bucketRevenue()</code> trong{" "}
            <code className="rounded bg-surface-alt px-1 py-0.5 font-mono">src/lib/queries.ts</code>).
          </li>
          <li className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
            Khi có đơn hàng thật, trang Tổng quan (<code className="rounded bg-surface-alt px-1 py-0.5 font-mono">/trang-ban-hang</code>)
            sẽ tự vẽ đúng số liệu thật — trang demo này không đụng gì tới luồng dữ liệu đó.
          </li>
        </ul>
      </Card>
    </div>
  );
}
