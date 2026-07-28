import Link from "next/link";

// Danh sách tag admin sửa qua /admin/noi-dung (SiteConfig.search_tags) —
// truyền từ trang chủ (Server Component), mặc định lấy qua getSearchTags()
// trong src/lib/site-config.ts. href trỏ thẳng /tim-kiem?q=<tag> (trước đây
// là "#" — link chết, sửa luôn vì đang đụng tới component này).
export default function TagCloud({ tags }: { tags: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-foreground">
        Tìm kiếm phổ biến
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tim-kiem?q=${encodeURIComponent(tag)}`}
            className="rounded-full bg-surface-alt px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-surface hover:text-brand-dark hover:ring-1 hover:ring-border-c"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
