import type { ComponentType, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

// ============================================================================
// BỘ COMPONENT DEMO DÙNG CHUNG — Quản Lý Bán Hàng (redesign).
// Rút ra từ hệ thiết kế của bản Tổng quan đã duyệt (SellerOverviewStats):
//   • Thẻ: rounded-2xl + viền mảnh border-border-c + shadow-sm (bóng mềm)
//   • Typography: eyebrow IN HOA giãn chữ → tiêu đề đậm → số liệu lớn tabular-nums
//     → nhãn mờ text-muted
//   • Vàng (brand) chỉ dùng làm màu NHẤN có chủ đích (nút chính, badge, viền
//     accent) — không tô tràn lan
//   • Segmented control bo tròn, empty-state nhẹ nhàng, badge trạng thái tinh tế
// TẤT CẢ chỉ dùng design token sẵn có (bg-surface, text-foreground, border-border-c,
// text-muted, brand, success/danger/info...) nên tự động chạy đúng ở SÁNG & TỐI.
// Đây là component DEMO — KHÔNG import từ trang thật, không sửa gì của trang thật.
// ============================================================================

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

// ---- Eyebrow (nhãn nhỏ in hoa giãn chữ) ------------------------------------
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{children}</p>
  );
}

// ---- Tiêu đề trang: eyebrow → h1 → subtitle + vùng hành động bên phải -------
export function PageHeader({
  eyebrow = "Quản lý bán hàng",
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
        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Thẻ nền (viền mảnh + bóng mềm) ----------------------------------------
export function Card({
  children,
  className = "",
  padding = "p-5",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border-c bg-surface shadow-sm ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-black text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

// ---- Thẻ số liệu (KPI) — giống hệt Tổng quan -------------------------------
export function StatCard({
  icon: Icon,
  iconWrap = "bg-brand-light text-brand-dark",
  label,
  value,
  accent = false,
  delta,
  sub,
}: {
  icon: IconType;
  iconWrap?: string;
  label: string;
  value: string;
  accent?: boolean;
  delta?: number | null;
  sub?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-brand-dark/30" : "border-border-c"
      }`}
    >
      {accent && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-dark to-brand" />}
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta !== undefined && delta !== null && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-4 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 break-words text-[26px] font-black leading-tight tabular-nums text-foreground">{value}</p>
      {sub && <p className="mt-2 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

// ---- Badge trạng thái (màu ngữ nghĩa, tinh tế) -----------------------------
export type Tone = "brand" | "success" | "danger" | "info" | "warn" | "neutral";

const toneClass: Record<Tone, string> = {
  brand: "bg-brand text-ink",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  warn: "bg-brand-light text-brand-dark",
  neutral: "bg-surface-alt text-muted",
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
  const dotColor: Record<Tone, string> = {
    brand: "bg-ink",
    success: "bg-success",
    danger: "bg-danger",
    info: "bg-info",
    warn: "bg-brand-dark",
    neutral: "bg-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${toneClass[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]}`} />}
      {children}
    </span>
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
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-alt text-muted">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </span>
      {title && <p className="text-sm font-bold text-foreground">{title}</p>}
      {children && <p className="max-w-[280px] text-xs text-muted">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ---- Nút ---------------------------------------------------------------------
const buttonVariant = {
  primary: "bg-brand text-ink hover:bg-brand-dark",
  secondary: "border border-border-c bg-surface text-foreground hover:bg-surface-alt",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-foreground hover:bg-surface-alt",
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass} ${buttonVariant[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---- Segmented control (bo tròn) — controlled ------------------------------
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
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-border-c bg-surface-alt p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            value === o.value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-border-c bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand-dark focus:outline-none sm:w-64"
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
      <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

const controlClass =
  "w-full rounded-lg border border-border-c bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-dark focus:outline-none";

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
// Desktop: <table> thật, thead nền surface-alt in hoa mờ, hàng hover.
// Mobile (< md): mỗi hàng thành 1 THẺ (label:value), không vỡ layout.
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
      <div className="hidden overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-c bg-surface-alt text-[11px] font-bold uppercase tracking-wide text-muted">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className="border-b border-border-c transition last:border-0 hover:bg-surface-alt"
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
          <div key={rowKey(row, i)} className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm">
            <div className="mb-2 min-w-0 text-sm font-bold text-foreground">{primary.render(row)}</div>
            <div className="flex flex-col gap-1.5">
              {rest.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-muted">{c.header}</span>
                  <span className="min-w-0 text-right font-medium text-foreground">{c.render(row)}</span>
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
      <p className="text-xs text-muted">
        Trang <b className="tabular-nums text-foreground">{page}</b> / {totalPages}
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:bg-surface-alt disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:bg-surface-alt disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---- Định dạng tiền (bản demo tự chứa, không phụ thuộc trang thật) ----------
export function formatVndDemo(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}
