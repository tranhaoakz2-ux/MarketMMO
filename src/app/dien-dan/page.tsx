import { Heart, MessageSquare } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Breadcrumb from "@/components/Breadcrumb";
import ForumNewPostPanel from "@/components/ForumNewPostPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getForumPosts } from "@/lib/forum";

export const dynamic = "force-dynamic";

const categoryColors: Record<string, string> = {
  "Kinh nghiệm": "bg-success/10 text-success",
  "Chia sẻ": "bg-brand-light text-ink",
  "Hỏi đáp": "bg-blue-100 text-blue-700",
  "Cảnh báo": "bg-danger/10 text-danger",
  "Mua bán": "bg-purple-100 text-purple-700",
  "Thông báo": "bg-ink text-brand",
};

export default async function ForumPage() {
  const posts = await getForumPosts();

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Diễn đàn" }]} />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-black text-ink">
                Diễn đàn cộng đồng MarketMMO
              </h1>
              <ForumNewPostPanel />
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dien-dan/${post.id}`}
                  className="block rounded-xl border border-border-c bg-surface p-4 shadow-sm transition hover:border-brand hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryColors[post.category] ?? "bg-surface-alt text-muted"}`}
                    >
                      {post.category}
                    </span>
                    <span className="text-xs text-muted">
                      {post.createdAt.toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-ink">
                    {post.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{post.excerpt}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <Avatar size={20} />
                      {post.authorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {post.likeCount}
                    </span>
                  </div>
                </Link>
              ))}
              {posts.length === 0 && (
                <p className="rounded-xl border border-dashed border-border-c bg-surface-alt p-10 text-center text-sm text-muted">
                  Chưa có bài viết nào — hãy là người đầu tiên đăng bài.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Diễn đàn — MarketMMO",
};
