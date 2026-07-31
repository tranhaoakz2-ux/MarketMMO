"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CategoryTreeNode } from "@/lib/queries";
import { PRODUCT_SORT_OPTIONS, type ProductSortKey } from "@/lib/product-sort";

// Sentinel slug cho nhóm ảo "Khác" (danh mục lá chưa gán nhóm cha nào) —
// không trùng với slug thật nào trong DB (slug thật luôn qua slugifyCategory,
// không chứa dấu gạch dưới đôi).
const OTHER_GROUP_SLUG = "__khac__";

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

// Bộ lọc danh mục dạng tab 2 tầng:
// - Tầng trên: 1 tab cho mỗi nhóm cha (Category.parentId IS NULL, xem
//   getCategoryTree() ở queries.ts) — hoàn toàn động, thêm/bớt nhóm cha
//   trong DB tự phản ánh, không cần sửa code.
// - Tầng dưới: CHỈ hiện chip con của đúng 1 nhóm đang chọn — giữ thanh gọn
//   dù sau này có bao nhiêu danh mục con đi nữa (khác bản cũ hiện tất cả
//   nhóm + tất cả con cùng lúc).
export default function CategoryTabs({
  tree,
  countBySlug,
  sort,
}: {
  tree: CategoryTreeNode[];
  countBySlug: Record<string, number>;
  sort: ProductSortKey | "default";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Đổi sắp xếp -> điều hướng sang cùng trang kèm ?sort=..., reset về trang 1
  // (thứ tự đã đổi thì "trang 3" cũ không còn ý nghĩa) — router.push() ở App
  // Router là điều hướng mềm (không tải lại cả trang), khớp yêu cầu "sắp xếp
  // lại NGAY, không load lại trang thô".
  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}#danh-sach-san-pham`);
  };

  const groups = tree.filter((node) => node.children.length > 0);
  const orphanLeaves = tree.filter((node) => node.children.length === 0);

  // Gộp danh mục lá chưa có nhóm cha thành 1 "nhóm ảo" Khác — dùng lại
  // đúng cơ chế render nhóm cha có sẵn thay vì viết nhánh riêng, để không
  // âm thầm biến mất khỏi bộ lọc này.
  const allGroups: CategoryTreeNode[] =
    orphanLeaves.length > 0
      ? [
          ...groups,
          {
            id: OTHER_GROUP_SLUG,
            slug: OTHER_GROUP_SLUG,
            name: "Khác",
            emoji: "🗂️",
            sortOrder: Number.MAX_SAFE_INTEGER,
            children: orphanLeaves,
          },
        ]
      : groups;

  const [activeGroupSlug, setActiveGroupSlug] = useState<string>("ALL");
  const activeGroup = allGroups.find((g) => g.slug === activeGroupSlug) ?? null;
  const totalAllCount = allGroups.reduce((sum, g) => sum + countForNode(g, countBySlug), 0);

  return (
    <div className="rounded-xl border border-border-c bg-surface p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Tầng trên — tab nhóm cha, cuộn ngang gọn trên mobile nếu nhiều
            nhóm, scrollbar ẩn cho gọn mắt. Xếp cột trên mobile (dưới sm)
            để "Sắp xếp" không chen ngang làm co hẹp hàng tab. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveGroupSlug("ALL")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-tight transition ${
              activeGroupSlug === "ALL"
                ? "bg-ink text-white shadow-sm"
                : "bg-surface-alt text-muted hover:text-foreground"
            }`}
          >
            Tất cả
          </button>
          {allGroups.map((g) => (
            <button
              key={g.slug}
              onClick={() => setActiveGroupSlug(g.slug)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black uppercase tracking-tight transition ${
                activeGroupSlug === g.slug
                  ? "bg-ink text-white shadow-sm"
                  : "bg-surface-alt text-muted hover:text-foreground"
              }`}
            >
              <span className="text-sm normal-case leading-none">{g.emoji}</span>
              {g.name}
            </button>
          ))}
        </div>

        <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
          Sắp xếp:
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-lg border border-border-c bg-surface px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
          >
            {PRODUCT_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Tầng dưới — chip con của đúng nhóm đang chọn */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-c pt-3">
        {activeGroupSlug === "ALL" ? (
          <Link
            href="/danh-muc"
            className="flex items-center gap-1.5 rounded-full border border-brand-dark bg-brand-light/40 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Tất cả sản phẩm
            <span className="text-muted">({totalAllCount})</span>
          </Link>
        ) : (
          activeGroup && (
            <>
              {activeGroup.slug !== OTHER_GROUP_SLUG && (
                <Link
                  href={`/danh-muc/${activeGroup.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-brand-dark bg-brand-light/40 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Tất cả
                  <span className="text-muted">({countForNode(activeGroup, countBySlug)})</span>
                </Link>
              )}
              {activeGroup.children.map((child) => (
                <CategoryChip
                  key={child.slug}
                  slug={child.slug}
                  name={child.name}
                  emoji={child.emoji}
                  count={countForNode(child, countBySlug)}
                />
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}
