"use client";

import { Check, ChevronDown, ChevronRight, Heart, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/Avatar";

// Cây danh mục động — nhóm cha lồng category con (đệ quy, không giới hạn
// tầng), khớp CategoryTreeNode trả về từ getCategoryTree() (src/lib/queries.ts).
// Thêm nhóm/category mới chỉ cần thêm dữ liệu (Category.parentId) — component
// này KHÔNG hardcode bất kỳ slug/tên nhóm nào.
export type SidebarCategory = {
  slug: string;
  name: string;
  emoji: string;
  children: SidebarCategory[];
};
export type SidebarForumPost = {
  id: string;
  title: string;
  authorName: string;
  commentCount: number;
  likeCount: number;
};

// Tính sẵn tập slug cần MỞ RỘNG ban đầu = mọi nhóm cha nằm trên đường đi tới
// activeSlug (kể cả khi activeSlug chính là 1 nhóm cha) — để vào thẳng URL
// của 1 category con vẫn thấy đúng nhóm cha của nó đang mở, không phải tự
// bấm mở lại.
function findExpandedAncestors(nodes: SidebarCategory[], activeSlug: string): Set<string> {
  const expanded = new Set<string>();
  function visit(node: SidebarCategory): boolean {
    let matches = node.slug === activeSlug;
    for (const child of node.children) {
      if (visit(child)) matches = true;
    }
    if (matches && node.children.length > 0) expanded.add(node.slug);
    return matches;
  }
  nodes.forEach(visit);
  return expanded;
}

function CategoryTreeRow({
  node,
  depth,
  activeSlug,
  expanded,
  onToggle,
}: {
  node: SidebarCategory;
  depth: number;
  activeSlug: string;
  expanded: Set<string>;
  onToggle: (slug: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const active = node.slug === activeSlug;
  const isExpanded = expanded.has(node.slug);

  return (
    <li>
      <div
        className="flex items-center justify-between gap-1.5"
        style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}
      >
        <Link href={`/danh-muc/${node.slug}`} className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5">
          <span
            className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-2 ${
              active ? "border-brand bg-brand" : "border-border-c"
            }`}
          >
            {active && <Check className="h-3 w-3 text-foreground" strokeWidth={3} />}
          </span>
          <span className="shrink-0 leading-none">{node.emoji}</span>
          <span
            className={`truncate text-sm ${
              active
                ? "font-semibold text-foreground"
                : hasChildren
                  ? "font-bold text-foreground"
                  : "text-muted"
            }`}
          >
            {node.name}
          </span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.slug)}
            className="shrink-0 rounded p-0.5 text-muted transition hover:text-foreground"
            aria-label={isExpanded ? `Thu gọn ${node.name}` : `Mở rộng ${node.name}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <ul className="mt-1.5 flex flex-col gap-2">
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.slug}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CategorySidebar({
  activeSlug,
  categories,
  posts,
}: {
  activeSlug: string;
  categories: SidebarCategory[];
  posts: SidebarForumPost[];
}) {
  const [stockOnly, setStockOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    findExpandedAncestors(categories, activeSlug)
  );
  const toggleExpand = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-64 lg:shrink-0">
      <div className="rounded-xl border-2 border-brand bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Bộ lọc</h3>
          <ChevronDown className="h-[18px] w-[18px] text-foreground" />
        </div>
        <p className="mb-3 mt-1 text-sm font-medium text-brand-dark">Chọn danh mục</p>

        <ul className="flex flex-col gap-2.5">
          <li>
            {/* Trỏ tới /danh-muc (trang "tất cả sản phẩm"), KHÔNG phải "/"
                (trang chủ) — bug cũ: bấm "Tất cả" bị văng khỏi trang danh
                sách thay vì lọc bỏ category. */}
            <Link href="/danh-muc" className="flex items-center justify-between gap-2">
              <span
                className={`flex items-center gap-2.5 text-sm ${
                  !activeSlug ? "font-semibold text-foreground" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-2 ${
                    !activeSlug ? "border-brand bg-brand" : "border-border-c"
                  }`}
                >
                  {!activeSlug && <Check className="h-3 w-3 text-foreground" strokeWidth={3} />}
                </span>
                Tất cả
              </span>
            </Link>
          </li>
          {categories.map((node) => (
            <CategoryTreeRow
              key={node.slug}
              node={node}
              depth={0}
              activeSlug={activeSlug}
              expanded={expanded}
              onToggle={toggleExpand}
            />
          ))}
        </ul>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-brand-dark">
          <Search className="h-3.5 w-3.5" /> Tìm kiếm
        </button>
      </div>

      <div className="rounded-xl border-2 border-brand bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-foreground">Tình trạng kho</h3>
        <div className="flex flex-col gap-2 text-base text-foreground">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="stock"
              checked={!stockOnly}
              onChange={() => setStockOnly(false)}
              className="h-4 w-4 accent-brand"
            />
            Tất cả
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="stock"
              checked={stockOnly}
              onChange={() => setStockOnly(true)}
              className="h-4 w-4 accent-brand"
            />
            Chỉ hiện còn hàng
          </label>
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-foreground">Bài viết tham khảo</h3>
        <ul className="flex flex-col">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-dashed border-border-c last:border-b-0">
              <Link
                href={`/dien-dan/${post.id}`}
                className="block rounded-lg px-3 py-3 transition-all duration-200 hover:translate-x-1 hover:bg-surface-alt"
              >
                <p className="text-sm font-medium leading-snug text-foreground">{post.title}</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted">
                  <span className="flex shrink-0 items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {post.commentCount}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Heart className="h-3 w-3" /> {post.likeCount}
                  </span>
                  <span className="ml-auto flex min-w-0 items-center gap-1.5">
                    <Avatar size={16} />
                    <span className="truncate font-medium text-success">{post.authorName}</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">Chưa có bài viết nào.</li>
          )}
        </ul>

        <Link
          href="/dien-dan"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-border-c py-2 text-sm font-semibold text-foreground transition hover:bg-surface-alt"
        >
          Tất cả bài viết <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}
