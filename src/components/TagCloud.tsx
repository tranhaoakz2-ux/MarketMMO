const tags = [
  "Gmail EDU",
  "Hotmail",
  "Clone FB",
  "TikTok",
  "Mail Domain EDU",
  "Facebook",
  "Instagram",
  "Netflix",
  "Proxy",
  "Thuê Gmail",
];

export default function TagCloud() {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-muted">
        Tìm kiếm phổ biến
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <a
            key={tag}
            href="#"
            className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink hover:ring-1 hover:ring-border-c"
          >
            {tag}
          </a>
        ))}
      </div>
    </div>
  );
}
