import { Heart, MessagesSquare, MessageSquare } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Breadcrumb from "@/components/Breadcrumb";
import ForumNewPostPanel from "@/components/ForumNewPostPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getForumPosts } from "@/lib/forum";

export const dynamic = "force-dynamic";

// Mỗi chủ đề 1 màu badge riêng, tinh tế — dùng utility Tailwind có sẵn
// (không hardcode hex mới), khớp quy ước badge/tier đã dùng ở SellerDirectory.
const categoryColors: Record<string, string> = {
  "Kinh nghiệm": "border-success/30 bg-success/10 text-success",
  "Chia sẻ": "border-brand-dark/30 bg-brand-light/40 text-brand-dark",
  "Hỏi đáp": "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
  "Cảnh báo": "border-danger/30 bg-danger/10 text-danger",
  "Mua bán": "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400",
  "Thông báo": "border-ink bg-ink text-brand",
};

export default async function ForumPage() {
  const posts = await getForumPosts();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Diễn đàn" }]} />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
                  <MessagesSquare className="h-5 w-5 text-brand-dark" /> Diễn đàn cộng đồng MaketMMO
                </h1>
                <p className="mt-1 text-sm text-muted">
                  {posts.length} bài viết — kinh nghiệm, chia sẻ và trao đổi từ cộng đồng MaketMMO.
                </p>
              </div>
              <ForumNewPostPanel />
            </div>
          </Reveal>

          {posts.length === 0 ? (
            <Reveal delay={0.05}>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-c bg-surface px-6 py-16 text-center shadow-sm">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-light/40 text-brand-dark">
                  <MessagesSquare className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Chưa có bài viết nào</p>
                  <p className="mt-1 text-sm text-muted">Hãy là người đầu tiên đăng bài trong cộng đồng.</p>
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.05}>
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/dien-dan/${post.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-border-c bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark hover:shadow-lg sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${categoryColors[post.category] ?? "border-border-c bg-surface-alt text-muted"}`}
                      >
                        {post.category}
                      </span>
                      <span className="text-xs text-muted">
                        {post.createdAt.toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    <h2 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand-dark sm:text-lg">
                      {post.title}
                    </h2>

                    <p className="line-clamp-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-c pt-3.5 text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Avatar size={22} />
                        {post.authorName}
                      </span>
                      <div className="flex items-center gap-3 text-muted">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" /> {post.likeCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Diễn đàn — MaketMMO",
};
