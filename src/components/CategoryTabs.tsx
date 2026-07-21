"use client";

import { LayoutGrid, Lock, Wrench } from "lucide-react";
import Link from "next/link";
import { createElement, useState } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";

const tabs = ["Tất cả", "Sản phẩm", "Dịch vụ"] as const;
type Tab = (typeof tabs)[number];

// Schema chưa tách bảng "dịch vụ" khỏi "sản phẩm" — coi 3 category liên quan
// tới cày thuê/nâng cấp là nhóm "Dịch vụ", còn lại là "Sản phẩm" (đồng bộ
// với serviceMenuItems trong Header.tsx).
const serviceCategorySlugs = new Set(["boosting", "chatgpt", "youtube"]);

export type CategoryWithCount = {
  slug: string;
  name: string;
  count: number;
};

function CategoryChip({ slug, name, count }: CategoryWithCount) {
  return (
    <Link
      href={`/danh-muc/${slug}`}
      className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-brand-light"
    >
      {createElement(getCategoryIcon(slug), { className: "h-3.5 w-3.5", strokeWidth: 1.75 })}
      {name}
      <span className="text-muted">({count})</span>
    </Link>
  );
}

export default function CategoryTabs({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [tab, setTab] = useState<Tab>("Tất cả");

  const productCategories = categories.filter((c) => !serviceCategorySlugs.has(c.slug));
  const serviceCategories = categories.filter((c) => serviceCategorySlugs.has(c.slug));
  const productCount = productCategories.reduce((sum, c) => sum + c.count, 0);
  const serviceCount = serviceCategories.reduce((sum, c) => sum + c.count, 0);

  const showProducts = tab !== "Dịch vụ";
  const showServices = tab !== "Sản phẩm";

  return (
    <div className="rounded-xl border border-border-c bg-surface p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col gap-2 lg:w-36">
          <div className="flex items-center gap-1 rounded-lg bg-surface-alt p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-black uppercase tracking-tight transition ${
                  tab === t
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border-c"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
            Sắp xếp:
            <select className="flex-1 rounded-lg border border-border-c bg-surface px-2 py-1 text-xs font-semibold text-foreground focus:outline-none">
              <option>Mặc định</option>
              <option>Mới nhất</option>
              <option>Giá thấp</option>
              <option>Giá cao</option>
            </select>
          </label>
        </div>

        <div className="hidden w-px self-stretch bg-border-c lg:block" />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {showProducts && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-black text-ink">
                <Lock className="h-3.5 w-3.5" /> SẢN PHẨM
              </span>
              <button
                onClick={() => setTab("Sản phẩm")}
                className="flex items-center gap-1.5 rounded-full border border-brand-dark bg-brand-light/40 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Tất cả
                <span className="text-muted">({productCount})</span>
              </button>
              {productCategories.map((cat) => (
                <CategoryChip key={cat.slug} {...cat} />
              ))}
            </div>
          )}

          {showServices && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-info px-3 py-1.5 text-xs font-black text-white">
                <Wrench className="h-3.5 w-3.5" /> DỊCH VỤ
              </span>
              <button
                onClick={() => setTab("Dịch vụ")}
                className="flex items-center gap-1.5 rounded-full border border-info bg-info-light/60 px-3 py-1.5 text-xs font-bold text-info transition hover:bg-info-light"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Tất cả
                <span className="text-info/70">({serviceCount})</span>
              </button>
              {serviceCategories.map((cat) => (
                <CategoryChip key={cat.slug} {...cat} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
