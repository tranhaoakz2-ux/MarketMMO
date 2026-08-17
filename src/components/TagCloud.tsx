import { Search } from "lucide-react";
import Link from "next/link";

// Danh sách tag admin sửa qua /admin/noi-dung (SiteConfig.search_tags) —
// truyền từ trang chủ (Server Component), mặc định lấy qua getSearchTags()
// trong src/lib/site-config.ts. Mảng rỗng thì trang chủ tự ẩn hẳn khối này
// (xem src/app/page.tsx) — component không cần tự kiểm tra rỗng.
export default function TagCloud({ tags }: { tags: string[] }) {
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
        <Search className="h-4 w-4 text-brand-dark" /> Tìm kiếm phổ biến
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tim-kiem?q=${encodeURIComponent(tag)}`}
            className="rounded-full border border-border-c bg-surface-alt px-3.5 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-brand-dark hover:bg-brand-light/30 hover:text-brand-dark"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
