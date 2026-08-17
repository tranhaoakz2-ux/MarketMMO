import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function buildPageList(current: number, total: number): (number | "…")[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export default function Pagination({
  basePath,
  currentPage,
  totalCount,
  pageSize,
  sectionId = "danh-sach-san-pham",
  sort,
  pageParam = "page",
  extraParams,
}: {
  basePath: string;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  sectionId?: string;
  /** Giữ nguyên lựa chọn sắp xếp hiện tại khi chuyển trang — optional, mặc
      định undefined nên các trang chưa dùng sắp xếp (danh-muc, tìm kiếm...)
      không đổi hành vi gì. */
  sort?: string;
  /** Tên query param dùng cho số trang — mặc định "page". Chỉ cần đổi khi 1
      trang có NHIỀU cụm phân trang độc lập cùng lúc (vd /shop/[seller]: sản
      phẩm dùng "page", đánh giá dùng "reviewPage" riêng để đổi trang cụm
      này không ảnh hưởng cụm kia). */
  pageParam?: string;
  /** Query param khác cần giữ nguyên khi chuyển trang (vd `q` ở /tim-kiem) —
      optional, không truyền thì hành vi y hệt trước đây. */
  extraParams?: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) params.set(key, value);
    }
    if (p !== 1) params.set(pageParam, String(p));
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}#${sectionId}`;
  };
  const pages = buildPageList(page, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const navButtonClass =
    "grid h-[38px] w-[38px] place-items-center rounded-full border border-border-c bg-surface text-muted shadow-[0_2px_5px_rgba(0,0,0,0.03)] transition hover:bg-surface-alt";
  const disabledNavClass =
    "grid h-[38px] w-[38px] place-items-center rounded-full border border-border-c bg-surface-alt text-muted opacity-50";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={pageHref(page - 1)} aria-label="Trang trước" className={navButtonClass}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span aria-hidden className={disabledNavClass}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`dots-${i}`}
              className="px-0.5 text-base font-extrabold text-muted/70"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              className={`grid h-[38px] w-[38px] place-items-center rounded-full border text-sm font-bold transition ${
                p === page
                  ? "border-brand bg-brand text-ink shadow-[0_4px_15px_rgba(255,199,0,0.35)]"
                  : "border-border-c bg-surface text-muted shadow-[0_2px_5px_rgba(0,0,0,0.03)] hover:bg-surface-alt"
              }`}
            >
              {p}
            </Link>
          )
        )}

        {page < totalPages ? (
          <Link href={pageHref(page + 1)} aria-label="Trang sau" className={navButtonClass}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span aria-hidden className={disabledNavClass}>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-muted">
        Hiển thị {from} - {to} của {totalCount} sản phẩm
      </p>
    </div>
  );
}
