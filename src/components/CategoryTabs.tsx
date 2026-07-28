"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CategoryTreeNode } from "@/lib/queries";

// Đếm đệ quy — lá dùng countBySlug trực tiếp, nhóm cha cộng dồn từ mọi con
// cháu. Không giới hạn 1 tầng (dù cây hiện tại chỉ sâu 2 tầng) để nhất quán
// với getProductsByCategory()/collectDescendantCategoryIds() ở queries.ts.
function countForNode(node: CategoryTreeNode, countBySlug: Record<string, number>): number {
  if (node.children.length === 0) return countBySlug[node.slug] ?? 0;
  return node.children.reduce((sum, child) => sum + countForNode(child, countBySlug), 0);
}

function CategoryChip({
  slug,
  name,
  emoji,
  count,
}: {
  slug: string;
  name: string;
  emoji: string;
  count: number;
}) {
  return (
    <Link
      href={`/danh-muc/${slug}`}
      className="flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-brand-light"
    >
      <span className="text-sm leading-none">{emoji}</span>
      {name}
      <span className="text-muted">({count})</span>
    </Link>
  );
}

// 1 hàng = 1 nhóm cha (Category.parentId IS NULL, xem getCategoryTree() ở
// queries.ts) — nhãn nhóm + chip "Tất cả" (gộp cả cây con) + chip từng danh
// mục con. Hoàn toàn động: thêm/bớt nhóm cha hay danh mục con trong DB tự
// phản ánh ở đây, KHÔNG cần sửa component (khác bản cũ hardcode 2 nhóm
// "Sản phẩm"/"Dịch vụ" theo 1 set slug cố định).
function ParentGroupRow({
  node,
  countBySlug,
}: {
  node: CategoryTreeNode;
  countBySlug: Record<string, number>;
}) {
  const total = countForNode(node, countBySlug);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white">
        <span className="text-sm leading-none">{node.emoji}</span>
        {node.name.toUpperCase()}
      </span>
      <Link
        href={`/danh-muc/${node.slug}`}
        className="flex items-center gap-1.5 rounded-full border border-brand-dark bg-brand-light/40 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Tất cả
        <span className="text-muted">({total})</span>
      </Link>
      {node.children.map((child) => (
        <CategoryChip
          key={child.slug}
          slug={child.slug}
          name={child.name}
          emoji={child.emoji}
          count={countForNode(child, countBySlug)}
        />
      ))}
    </div>
  );
}

export default function CategoryTabs({
  tree,
  countBySlug,
}: {
  tree: CategoryTreeNode[];
  countBySlug: Record<string, number>;
}) {
  // Nhóm cha = node gốc có con (cấu trúc thuần, không cờ riêng — cùng quy
  // ước đã dùng cho sidebar/dropdown "Sản phẩm"). Node gốc KHÔNG có con
  // (danh mục lá chưa được gán vào nhóm nào) vẫn hiện — gộp vào hàng "Khác"
  // để không âm thầm biến mất khỏi bộ lọc này.
  const groups = tree.filter((node) => node.children.length > 0);
  const orphanLeaves = tree.filter((node) => node.children.length === 0);

  const [activeGroupSlug, setActiveGroupSlug] = useState<string>("ALL");

  return (
    <div className="rounded-xl border border-border-c bg-surface p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-alt p-1">
            <button
              onClick={() => setActiveGroupSlug("ALL")}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-black uppercase tracking-tight transition ${
                activeGroupSlug === "ALL"
                  ? "bg-surface text-foreground shadow-sm ring-1 ring-border-c"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Tất cả
            </button>
            {groups.map((g) => (
              <button
                key={g.slug}
                onClick={() => setActiveGroupSlug(g.slug)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-black uppercase tracking-tight transition ${
                  activeGroupSlug === g.slug
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border-c"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {g.name}
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
          {groups
            .filter((g) => activeGroupSlug === "ALL" || activeGroupSlug === g.slug)
            .map((g) => (
              <ParentGroupRow key={g.slug} node={g} countBySlug={countBySlug} />
            ))}

          {activeGroupSlug === "ALL" && orphanLeaves.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white">
                Khác
              </span>
              {orphanLeaves.map((l) => (
                <CategoryChip
                  key={l.slug}
                  slug={l.slug}
                  name={l.name}
                  emoji={l.emoji}
                  count={countBySlug[l.slug] ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
