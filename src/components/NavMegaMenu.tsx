import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type MegaMenuItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string;
};

export default function NavMegaMenu({
  label,
  href,
  items,
  columns = 1,
}: {
  label: string;
  href: string;
  items: MegaMenuItem[];
  columns?: 1 | 2;
}) {
  return (
    <div className="group relative flex h-full items-center">
      <Link
        href={href}
        className="flex items-center gap-1 whitespace-nowrap transition group-hover:text-brand-dark"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition duration-200 group-hover:rotate-180 group-hover:text-brand-dark" />
      </Link>

      <div className="invisible absolute left-0 top-full z-50 translate-y-1 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mt-1 overflow-hidden rounded-xl border border-border-c bg-surface py-2 shadow-xl">
          <div
            className={`grid gap-x-4 gap-y-0.5 px-2 ${
              columns === 2 ? "grid-cols-2 w-72" : "w-52"
            }`}
          >
            {items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
                {item.badge && (
                  <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
