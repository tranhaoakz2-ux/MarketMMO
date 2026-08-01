"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CategoryMenuNode } from "@/components/ProductMegaMenu";

// Bản mobile của ProductMegaMenu.tsx — hover không dùng được trên cảm ứng
// nên chuyển sang accordion (bấm nhóm cha để mở/đóng danh sách con). Dùng
// chung dữ liệu `tree` với bản desktop (Header.tsx fetch 1 lần, truyền
// xuống cả 2), không hardcode danh mục nào.
export default function MobileProductAccordion({
  tree,
  onNavigate,
}: {
  tree: CategoryMenuNode[];
  onNavigate: () => void;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const triggerHref = tree.length > 0 ? `/danh-muc/${tree[0]!.slug}` : "/";

  return (
    <div className="flex flex-col">
      <Link
        href={triggerHref}
        onClick={onNavigate}
        className="rounded-lg px-2 py-2.5 hover:bg-surface-alt hover:text-brand-dark"
      >
        Sản phẩm
      </Link>
      <div className="flex flex-col gap-0.5 pl-2">
        {tree.map((parent) => {
          const hasChildren = parent.children.length > 0;
          const isOpen = openSlug === parent.slug;
          return (
            <div key={parent.slug}>
              <div className="flex items-center gap-1">
                <Link
                  href={`/danh-muc/${parent.slug}`}
                  onClick={onNavigate}
                  className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-alt hover:text-brand-dark"
                >
                  {parent.name}
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => setOpenSlug((s) => (s === parent.slug ? null : parent.slug))}
                    className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface-alt hover:text-foreground"
                    aria-label={isOpen ? `Thu gọn ${parent.name}` : `Mở rộng ${parent.name}`}
                  >
                    <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {hasChildren && isOpen && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border-c pl-3">
                  {parent.children.map((child) => (
                    <Link
                      key={child.slug}
                      href={`/danh-muc/${child.slug}`}
                      onClick={onNavigate}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground/70 hover:bg-surface-alt hover:text-brand-dark"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
