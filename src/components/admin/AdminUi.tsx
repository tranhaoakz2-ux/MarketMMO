// Bộ UI dùng chung cho mọi trang con /admin/* — tránh lặp lại chuỗi class
// dài (border-[var(--adm-border)] bg-[var(--adm-surface)]...) ở >10 panel
// khác nhau. Chỉ style thuần theo token --adm-* đã khai báo trong
// globals.css (.admin-shell), không chứa logic nghiệp vụ.
import type { ReactNode } from "react";

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-8 text-center text-sm text-[var(--adm-muted)]">
      {children}
    </div>
  );
}

const badgeVariant: Record<string, string> = {
  success: "bg-[var(--adm-success-bg)] text-[var(--adm-success)]",
  danger: "bg-[var(--adm-danger-bg)] text-[var(--adm-danger)]",
  warn: "bg-[var(--adm-warn-bg)] text-[var(--adm-warn)]",
  info: "bg-[var(--adm-info-bg)] text-[var(--adm-info)]",
  neutral: "bg-white/[0.06] text-[var(--adm-muted)]",
};

export function AdminBadge({
  variant,
  children,
}: {
  variant: "success" | "danger" | "warn" | "info" | "neutral";
  children: ReactNode;
}) {
  return (
    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeVariant[variant]}`}>
      {children}
    </span>
  );
}

export function AdminButton({
  onClick,
  disabled,
  variant = "neutral",
  children,
  type = "button",
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "brand" | "success" | "danger" | "neutral";
  children: ReactNode;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    brand: "bg-[var(--adm-brand)] text-[#14141f] hover:bg-[var(--adm-brand-dark)]",
    success: "bg-[var(--adm-success)] text-[#06150d] hover:opacity-90",
    danger: "bg-[var(--adm-danger)] text-[#1a0605] hover:opacity-90",
    neutral:
      "bg-[var(--adm-surface-2)] text-[var(--adm-text)] border border-[var(--adm-border)] hover:bg-white/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function AdminPageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-lg font-black text-[var(--adm-text)]">{title}</h1>
      <p className="mt-0.5 text-xs text-[var(--adm-muted)]">{sub}</p>
    </div>
  );
}
