import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, TrendingDown, TrendingUp } from "lucide-react";

// ============================================================================
// BỘ COMPONENT DÙNG CHUNG — Admin Control Center. Đây là bộ component THẬT,
// được 34 file dưới /admin import trực tiếp (tên "-demo" chỉ còn là di sản
// đặt tên từ đợt build đầu, KHÔNG phải file demo/nháp — xem ghi chú tương tự
// ở seller-demo/DemoKit.tsx, cũng là bộ THẬT của Quản Lý Bán Hàng).
//
// Từ đợt đồng bộ thiết kế buyer/seller/admin: mọi token --adm-* giờ alias
// thẳng sang token chính của site (xem .admin-shell trong globals.css), và
// cách dựng từng component (bóng, bo góc, hiệu ứng hover) khớp NGUYÊN VĂN
// với seller-demo/DemoKit.tsx + các trang buyer đã design (hồ sơ cá nhân,
// giỏ hàng...) — không chỉ "giống màu" mà giống cả cảm giác chạm (shadow-sm
// thay vì bóng đen cứng, nút nhấc lên khi hover thay vì chỉ đổi màu phẳng).
//   • Thẻ: rounded-2xl + viền mảnh var(--adm-border) + shadow-sm (bóng mềm
//     chuẩn Tailwind, tự đúng sáng/tối — KHÔNG còn bóng đen cứng
//     rgba(0,0,0,.35) hardcode như trước, nhìn nặng ở light mode).
//   • Nút chính/thành công: thêm hover:-translate-y-0.5 hover:shadow-md
//     (nhấc nhẹ lên khi hover) — đúng hiệu ứng nút "Lưu thay đổi"/"Thanh
//     toán qua ví" ở trang hồ sơ cá nhân/giỏ hàng, KHÔNG áp cho nút phụ/nguy
//     hiểm (giữ hover phẳng, tránh mọi nút đều "nhấc" gây rối mắt).
//   • Typography: eyebrow IN HOA giãn chữ → tiêu đề đậm → số liệu lớn
//     tabular-nums → nhãn mờ var(--adm-muted).
//   • Badge trạng thái dùng tông ngữ nghĩa (success/danger/warn/info), không
//     phải màu trang trí.
// TẤT CẢ chỉ dùng token --adm-* SẴN CÓ (không chế mã màu mới) qua cú pháp
// Tailwind arbitrary value — CHỈ hoạt động đúng bên trong wrapper class
// "admin-shell" (nơi các biến này được khai báo).
// ============================================================================

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

// ---- Eyebrow (nhãn nhỏ in hoa giãn chữ) ------------------------------------
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--adm-muted)]">
      {children}
    </p>
  );
}

// ---- Tiêu đề trang: eyebrow → h1 → subtitle + vùng hành động bên phải -------
export function PageHeader({
  eyebrow = "Admin Control Center",
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--adm-text)] sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--adm-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Thẻ nền (viền mảnh + bóng mềm, KHÔNG viền vàng cứng) ------------------
export function Card({
  children,
  className = "",
  padding = "p-5",
  id,
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] shadow-sm ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-black text-[var(--adm-text)]">{children}</h2>
      {aside}
    </div>
  );
}

// ---- Thẻ số liệu (KPI) — viền mảnh mặc định, accent vàng CHỈ khi accent=true
// dưới dạng 1 hairline mỏng phía trên (không phải viền dày bao quanh cả thẻ).
export type StatTone = "brand" | "success" | "danger" | "info" | "warn";

const iconToneClass: Record<StatTone, string> = {
  brand: "bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]",
  success: "bg-[var(--adm-success-bg)] text-[var(--adm-success)]",
  danger: "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]",
  info: "bg-[var(--adm-info-bg)] text-[var(--adm-info)]",
  warn: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]",
};

export function StatCard({
  icon: Icon,
  tone = "brand",
  label,
  value,
  accent = false,
  delta,
  sub,
  href,
}: {
  icon: IconType;
  tone?: StatTone;
  label: string;
  value: string;
  accent?: boolean;
  delta?: number | null;
  sub?: string;
  href?: string;
}) {
  const body = (
    <>
      {accent && (
        <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[var(--adm-brand)] to-[var(--adm-brand-dark)]" />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconToneClass[tone]}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta !== undefined && delta !== null && (
          <span
            className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0
                ? "bg-[var(--adm-success-bg)] text-[var(--adm-success)]"
                : "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--adm-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words text-[26px] font-black leading-tight tabular-nums text-[var(--adm-text)]">
        {value}
      </p>
      {sub && <p className="mt-2 text-[11px] text-[var(--adm-muted)]">{sub}</p>}
    </>
  );

  const className = `group relative block overflow-hidden rounded-2xl border bg-[var(--adm-surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
    accent ? "border-[var(--adm-brand-dark)]/30" : "border-[var(--adm-border)]"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

// ---- Badge trạng thái (màu ngữ nghĩa, tinh tế) -----------------------------
export type Tone = "brand" | "success" | "danger" | "info" | "warn" | "neutral";

const toneClass: Record<Tone, string> = {
  brand: "bg-[var(--adm-brand)] text-[#14141f]",
  success: "bg-[var(--adm-success-bg)] text-[var(--adm-success)]",
  danger: "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]",
  info: "bg-[var(--adm-info-bg)] text-[var(--adm-info)]",
  warn: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]",
  neutral: "bg-[var(--adm-surface-2)] text-[var(--adm-muted)]",
};

const dotClass: Record<Tone, string> = {
  brand: "bg-[#14141f]",
  success: "bg-[var(--adm-success)]",
  danger: "bg-[var(--adm-danger)]",
  info: "bg-[var(--adm-info)]",
  warn: "bg-[var(--adm-warn)]",
  neutral: "bg-[var(--adm-muted)]",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${toneClass[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]}`} />}
      {children}
    </span>
  );
}

// ---- Badge số đếm nhỏ (dùng cho sidebar/nhóm) ------------------------------
// showZero: dùng cho panel "Cần xử lý" — badge LUÔN hiển thị (kể cả 0), xanh
// khi 0 (không có việc tồn đọng), đỏ khi > 0. Không truyền showZero (mặc
// định) thì ẩn hẳn badge khi count=0, hợp với ngữ cảnh sidebar/nhóm gọn.
export function CountPill({
  count,
  tone = "danger",
  showZero = false,
}: {
  count: number;
  tone?: "danger" | "warn" | "brand";
  showZero?: boolean;
}) {
  if (count <= 0) {
    if (!showZero) return null;
    return (
      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--adm-success-bg)] px-1.5 text-[10.5px] font-black tabular-nums text-[var(--adm-success)]">
        0
      </span>
    );
  }
  const cls: Record<string, string> = {
    danger: "bg-[var(--adm-danger)] text-[#1a0605]",
    warn: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]",
    brand: "bg-[var(--adm-brand)] text-[#14141f]",
  };
  return (
    <span
      className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10.5px] font-black tabular-nums ${cls[tone]}`}
    >
      {count}
    </span>
  );
}

// ---- Skeleton loading (gọn, dùng cho panel fetch dữ liệu thật client-side) --
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--adm-surface-2)] ${className}`} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] shadow-sm">
      <div className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-3">
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-[var(--adm-border)] px-4 py-3.5 last:border-0">
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="h-3.5 w-1/6" />
          <Skeleton className="h-3.5 w-1/6" />
          <Skeleton className="ml-auto h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---- Empty-state nhẹ nhàng --------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: IconType;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--adm-surface-2)] text-[var(--adm-muted)]">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </span>
      {title && <p className="text-sm font-bold text-[var(--adm-text)]">{title}</p>}
      {children && <p className="max-w-[280px] text-xs text-[var(--adm-muted)]">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ---- Nút ---------------------------------------------------------------------
// primary/success "nhấc lên" khi hover (khớp nút CTA chính ở hồ sơ cá nhân/
// giỏ hàng) — secondary/danger/ghost giữ hover phẳng, đây là hành động phụ/
// mang tính cảnh báo, không cần nhấn mạnh thêm bằng chuyển động.
const buttonVariant = {
  primary: "bg-[var(--adm-brand)] text-[#14141f] shadow-sm hover:-translate-y-0.5 hover:bg-[var(--adm-brand-dark)] hover:shadow-md",
  secondary:
    "border border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text)] hover:bg-black/5 dark:hover:bg-white/10",
  success: "bg-[var(--adm-success)] text-white shadow-sm hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md",
  danger: "bg-[var(--adm-danger)] text-white hover:opacity-90",
  ghost: "text-[var(--adm-text)] hover:bg-black/5 dark:hover:bg-white/[0.06]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: keyof typeof buttonVariant;
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-bold transition disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${sizeClass} ${buttonVariant[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---- Segmented control (bo tròn) — controlled ------------------------------
// Mục đang chọn là 1 "pill" nổi màu surface + shadow-sm trên nền xám, KHÔNG
// tô đặc vàng như trước — khớp đúng kiểu tab lọc ở seller-demo/DemoKit.tsx
// (mềm mại hơn, vàng chỉ còn dùng cho nút hành động chính, không lặp lại ở
// mọi tab đang chọn).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            value === o.value
              ? "bg-[var(--adm-surface)] text-[var(--adm-text)] shadow-sm"
              : "text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Ô tìm kiếm -------------------------------------------------------------
export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--adm-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--adm-text)] placeholder:text-[var(--adm-muted)] focus:border-[var(--adm-brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--adm-brand)]/25 sm:w-64"
      />
    </div>
  );
}

// ---- Thanh lọc (gom search + segmented + hành động) ------------------------
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

// ---- Trường form (label + hint + control) ----------------------------------
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--adm-muted)]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[var(--adm-muted)]">{hint}</p>}
    </div>
  );
}

// rounded-xl (khớp ô input ở hồ sơ cá nhân/giỏ hàng, thay vì rounded-lg cũ)
// + ring vàng mềm khi focus, thay vì chỉ đổi màu viền.
const controlClass =
  "w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] placeholder:text-[var(--adm-muted)] focus:border-[var(--adm-brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--adm-brand)]/25";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

// ---- Bảng dữ liệu responsive -----------------------------------------------
// Desktop: <table> thật, thead nền surface-2 in hoa mờ, hàng hover.
// Mobile (< md): mỗi hàng thành 1 THẺ (label:value), không vỡ layout — tên
// dài (email, tên sản phẩm...) tự xuống dòng/truncate theo cột "primary".
export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  primary?: boolean; // dùng làm tiêu đề thẻ trên mobile
  hideOnMobile?: boolean;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return <Card>{empty}</Card>;
  }
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className="border-b border-[var(--adm-border)] transition last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 align-middle ${c.align === "right" ? "text-right" : ""} ${c.className ?? ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: thẻ */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 shadow-sm"
          >
            <div className="mb-2 min-w-0 break-words text-sm font-bold text-[var(--adm-text)]">
              {primary.render(row)}
            </div>
            <div className="flex flex-col gap-1.5">
              {rest.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="shrink-0 text-[var(--adm-muted)]">{c.header}</span>
                  <span className="min-w-0 break-words text-right font-medium text-[var(--adm-text)]">
                    {c.render(row)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Phân trang -------------------------------------------------------------
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-[var(--adm-muted)]">
        Trang <b className="tabular-nums text-[var(--adm-text)]">{page}</b> / {totalPages}
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text)] transition hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text)] transition hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---- Biểu đồ cột nhỏ (SVG thuần, cùng kỹ thuật RevenueChart thật) ----------
export function MiniBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const W = 1200;
  const H = 220;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = Math.max(1, bars.length);
  const gap = n > 10 ? 6 : 20;
  const barW = (plotW - gap * (n - 1)) / n;
  const max = Math.max(1, ...bars.map((b) => b.value)) * 1.15;

  if (bars.length === 0 || bars.every((b) => b.value === 0)) {
    return (
      <div className="grid h-[180px] place-items-center text-xs text-[var(--adm-muted)]">
        Chưa có dữ liệu trong khoảng thời gian này.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full" preserveAspectRatio="none">
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={padL}
          x2={W - padR}
          y1={padT + (plotH / 3) * i}
          y2={padT + (plotH / 3) * i}
          stroke="var(--adm-border)"
          strokeWidth={1}
        />
      ))}
      {bars.map((b, i) => {
        const h = (b.value / max) * plotH;
        const x = padL + i * (barW + gap);
        const y = padT + plotH - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={Math.max(2, h)}
            rx={Math.min(6, barW / 2)}
            fill="var(--adm-brand)"
          />
        );
      })}
      {bars.map((b, i) => {
        const x = padL + i * (barW + gap);
        return (
          <text
            key={i}
            x={x + barW / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-[var(--adm-muted)] text-[20px] font-semibold"
          >
            {n > 8 ? "" : b.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---- Định dạng tiền (bản demo tự chứa, không phụ thuộc trang thật) ----------
export function formatVndDemo(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}
