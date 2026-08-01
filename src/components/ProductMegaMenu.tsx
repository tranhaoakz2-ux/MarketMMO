"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

export type CategoryMenuNode = {
  slug: string;
  name: string;
  emoji: string;
  children: CategoryMenuNode[];
};

// Dropdown "Sản phẩm" trên Header — 2 tầng ĐỘNG hoàn toàn từ DB (nhóm cha +
// danh mục con qua Category.parentId, xem getCategoryTree() trong
// src/lib/queries.ts), khác NavMegaMenu.tsx (chỉ hỗ trợ 1 tầng phẳng, vẫn
// dùng nguyên cho "Dịch vụ"/"Nạp tiền" — KHÔNG đụng file đó). Thêm/bớt nhóm
// cha hay danh mục con chỉ cần đổi dữ liệu (qua /admin/danh-muc hoặc SQL),
// không cần sửa component này.
//
// Flyout tầng 2 dùng CSS-only nested group-hover (`group/item`, Tailwind v4
// hỗ trợ group đặt tên) — không cần state/JS, giữ đúng triết lý CSS-only
// hover đã áp dụng cho NavMegaMenu.
export default function ProductMegaMenu({ tree }: { tree: CategoryMenuNode[] }) {
  const triggerHref = tree.length > 0 ? `/danh-muc/${tree[0]!.slug}` : "/";

  return (
    <div className="group relative flex h-full items-center">
      <Link
        href={triggerHref}
        className="flex items-center gap-1 whitespace-nowrap transition group-hover:text-brand-dark"
      >
        Sản phẩm
        <ChevronDown className="h-3.5 w-3.5 transition duration-200 group-hover:rotate-180 group-hover:text-brand-dark" />
      </Link>

      <div className="invisible absolute left-0 top-full z-50 translate-y-1 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {/* KHÔNG dùng overflow-hidden ở đây (khác NavMegaMenu.tsx) — sẽ cắt
            mất flyout tầng 2 vốn định vị absolute ra ngoài khung này. */}
        <div className="mt-1 rounded-xl border border-border-c bg-surface py-2 shadow-xl">
          <div className="flex w-56 flex-col gap-0.5 px-2">
            {tree.map((parent) => (
              <div key={parent.slug} className="group/item relative">
                <Link
                  href={`/danh-muc/${parent.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark group-hover/item:bg-surface-alt group-hover/item:text-brand-dark"
                >
                  <span className="flex items-center gap-2">{parent.name}</span>
                  {parent.children.length > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                </Link>

                {parent.children.length > 0 && (
                  <div className="invisible absolute left-full top-0 z-50 opacity-0 transition duration-150 group-hover/item:visible group-hover/item:opacity-100">
                    <div className="ml-1 w-56 overflow-hidden rounded-xl border border-border-c bg-surface py-2 shadow-xl">
                      {parent.children.map((child) => (
                        <Link
                          key={child.slug}
                          href={`/danh-muc/${child.slug}`}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
