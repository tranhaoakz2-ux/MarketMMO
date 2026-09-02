"use client";

import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryTreeNode } from "@/lib/queries";
import { PRODUCT_SORT_OPTIONS, type ProductSortKey } from "@/lib/product-sort";
import { stripLeadingEmoji } from "@/lib/text";

// Sentinel slug cho nhóm ảo "Khác" (danh mục lá chưa gán nhóm cha nào) —
// không trùng với slug thật nào trong DB (slug thật luôn qua slugifyCategory,
// không chứa dấu gạch dưới đôi).
const OTHER_GROUP_SLUG = "__khac__";
// Key ref riêng cho tab "Tất cả" (không phải 1 node thật trong allGroups).
const ALL_TAB_KEY = "ALL";

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
  count,
}: {
  slug: string;
  name: string;
  count: number;
}) {
  return (
    <Link
      href={`/danh-muc/${slug}`}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-brand-light"
    >
      {stripLeadingEmoji(name)}
      <span className="text-muted">({count})</span>
    </Link>
  );
}

// Bộ lọc danh mục dạng tab 2 tầng:
// - Tầng trên: 1 tab cho mỗi nhóm cha (Category.parentId IS NULL, xem
//   getCategoryTree() ở queries.ts) — hoàn toàn động, thêm/bớt nhóm cha
//   trong DB tự phản ánh, không cần sửa code. Cuộn ngang 1 dòng duy nhất
//   (không wrap) — nhiều nhóm cha vẫn gọn, có nút mũi tên hỗ trợ cuộn trên
//   desktop, vuốt tay trên mobile. Bug thật đã gặp: trước đây tràn ra ngoài
//   khung mà không có dấu hiệu cuộn được (scrollbar ẩn, không nút), người
//   dùng tưởng nhóm cuối bị mất — nay có mũi tên rõ ràng + tự cuộn tab đang
//   chọn vào khung nhìn.
// - Tầng dưới: CHỈ hiện chip con của đúng 1 nhóm đang chọn (cũng 1 dòng cuộn
//   ngang, đồng bộ hành vi với tầng trên) — giữ thanh gọn dù sau này có bao
//   nhiêu danh mục con đi nữa. "Sắp xếp" đặt cố định bên phải tầng này (tách
//   khỏi tầng tab cha để tab cha có trọn chiều ngang).
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

  // --- Cuộn ngang tầng tab cha: nút mũi tên + tự cuộn tab đang chọn vào khung nhìn ---
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = tabsScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollButtons);
    };
    // allGroups.length: thêm/bớt nhóm cha (props đổi theo lần tải trang) có
    // thể đổi trạng thái tràn — tính lại ngay không cần đợi sự kiện resize.
  }, [updateScrollButtons, allGroups.length]);

  // Bỏ qua lần chạy đầu tiên (mount) — chỉ cuộn khi NGƯỜI DÙNG chủ động bấm
  // chọn tab khác. Cố tình KHÔNG dùng Element.scrollIntoView() dù có set
  // inline/block "nearest": bug thật đã gặp — scrollIntoView vẫn có thể kéo
  // theo cuộn DỌC cả trang (qua mọi ancestor scroll container, kể cả
  // window) ngay lúc mount, khiến trang chủ mở lên bị nhảy thẳng xuống giữa
  // trang thay vì ở đầu. Thay bằng tính toán scrollLeft thủ công + gọi
  // scrollBy() TRỰC TIẾP trên đúng container ngang (tabsScrollRef) — không
  // đụng tới bất kỳ trục dọc/ancestor nào, an toàn tuyệt đối với cuộn trang.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const container = tabsScrollRef.current;
    const tab = tabRefs.current[activeGroupSlug];
    if (!container || !tab) return;
    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const EDGE_PADDING = 16;
    if (tabRect.left < containerRect.left) {
      container.scrollBy({ left: tabRect.left - containerRect.left - EDGE_PADDING, behavior: "smooth" });
    } else if (tabRect.right > containerRect.right) {
      container.scrollBy({ left: tabRect.right - containerRect.right + EDGE_PADDING, behavior: "smooth" });
    }
  }, [activeGroupSlug]);

  const scrollTabsBy = (direction: 1 | -1) => {
    tabsScrollRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  return (
    <div className="rounded-xl border border-border-c bg-surface p-3 shadow-sm dark:bg-[var(--section-navy)]">
      {/* Tầng trên — tab nhóm cha, luôn 1 dòng + cuộn ngang. Nút mũi tên chỉ
          hiện khi nội dung thực sự tràn (canScrollLeft/Right), ẩn trên mobile
          vì vuốt tay đã đủ dùng ở đó. */}
      <div className="flex items-center gap-1">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollTabsBy(-1)}
            aria-label="Cuộn sang trái"
            className="hidden shrink-0 items-center justify-center rounded-full border border-border-c bg-surface p-1.5 text-muted transition hover:border-brand-dark hover:text-foreground sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div
          ref={tabsScrollRef}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            ref={(el) => {
              tabRefs.current[ALL_TAB_KEY] = el;
            }}
            onClick={() => setActiveGroupSlug(ALL_TAB_KEY)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-tight transition ${
              activeGroupSlug === ALL_TAB_KEY
                ? "bg-ink text-white shadow-sm"
                : "bg-surface-alt text-muted hover:text-foreground"
            }`}
          >
            Tất cả
          </button>
          {allGroups.map((g) => (
            <button
              key={g.slug}
              ref={(el) => {
                tabRefs.current[g.slug] = el;
              }}
              onClick={() => setActiveGroupSlug(g.slug)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-tight transition ${
                activeGroupSlug === g.slug
                  ? "bg-ink text-white shadow-sm"
                  : "bg-surface-alt text-muted hover:text-foreground"
              }`}
            >
              {stripLeadingEmoji(g.name)}
            </button>
          ))}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollTabsBy(1)}
            aria-label="Cuộn sang phải"
            className="hidden shrink-0 items-center justify-center rounded-full border border-border-c bg-surface p-1.5 text-muted transition hover:border-brand-dark hover:text-foreground sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tầng dưới — chip con của đúng nhóm đang chọn (cuộn ngang) + Sắp xếp
          cố định bên phải, tách khỏi tầng tab cha. */}
      <div className="mt-3 flex items-center gap-2 border-t border-border-c pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeGroupSlug === ALL_TAB_KEY ? (
            <Link
              href="/danh-muc"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-dark bg-brand-light/40 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
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
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-dark bg-brand-light/40 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-light"
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
                    count={countForNode(child, countBySlug)}
                  />
                ))}
              </>
            )
          )}
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
    </div>
  );
}
