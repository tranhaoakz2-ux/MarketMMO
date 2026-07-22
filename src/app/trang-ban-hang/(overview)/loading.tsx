// Skeleton khi đang tải trang Tổng quan (đổi khoảng ngày → server re-fetch).
// Đặt trong route group (overview) để CHỈ áp cho trang này, không lan sang
// các trang seller khác (san-pham, rut-tien...). Khớp đúng bố cục thật bên
// dưới để không nhảy layout khi nội dung thật thay chỗ skeleton.
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-alt ${className}`} />;
}

export default function SellerOverviewLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Block className="h-3 w-32" />
          <Block className="h-8 w-40" />
          <Block className="h-3 w-64" />
        </div>
        <Block className="h-9 w-72 rounded-full" />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border-c bg-surface p-5">
            <div className="flex items-start justify-between">
              <Block className="h-10 w-10 rounded-xl" />
              <Block className="h-4 w-12 rounded-full" />
            </div>
            <Block className="mt-4 h-3 w-24" />
            <Block className="mt-2 h-7 w-32" />
          </div>
        ))}
      </div>

      <Block className="h-11 w-full" />

      {/* Grid chính */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border-c bg-surface p-5">
            <Block className="mb-4 h-4 w-44" />
            <Block className="h-52 w-full" />
          </div>
          <div className="rounded-2xl border border-border-c bg-surface p-5">
            <Block className="mb-4 h-4 w-40" />
            <Block className="h-3 w-full rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Block key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border-c bg-surface p-5">
            <Block className="mb-4 h-4 w-40" />
            {[0, 1, 2].map((i) => (
              <Block key={i} className="mb-3 h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border-c bg-surface p-5">
            <Block className="mb-4 h-4 w-28" />
            {[0, 1, 2].map((i) => (
              <Block key={i} className="mb-2.5 h-14 w-full" />
            ))}
          </div>
          <Block className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}
