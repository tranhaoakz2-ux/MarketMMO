import { MessageSquare } from "lucide-react";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumb from "@/components/Breadcrumb";
import ForumCommentForm from "@/components/ForumCommentForm";
import ForumLikeButton from "@/components/ForumLikeButton";
import ForumReportButton from "@/components/ForumReportButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { getForumPostById } from "@/lib/forum";

export const dynamic = "force-dynamic";

const categoryColors: Record<string, string> = {
  "Kinh nghiệm": "bg-success/10 text-success",
  "Chia sẻ": "bg-brand-light text-ink",
  "Hỏi đáp": "bg-blue-100 text-blue-700",
  "Cảnh báo": "bg-danger/10 text-danger",
  "Mua bán": "bg-purple-100 text-purple-700",
  "Thông báo": "bg-ink text-brand",
};

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const session = await auth();
  const post = await getForumPostById(postId, session?.user?.id);
  if (!post) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "/" },
              { label: "Diễn đàn", href: "/dien-dan" },
              { label: post.title },
            ]}
          />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <article className="rounded-xl border border-border-c bg-surface p-5 shadow-sm">
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

              <h1 className="mt-2 text-xl font-black text-ink">{post.title}</h1>

              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  <Avatar size={20} />
                  {post.authorName}
                </span>
              </div>

              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/90">
                {post.content}
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-border-c pt-4">
                <ForumLikeButton
                  postId={post.id}
                  initialLiked={post.likedByMe}
                  initialCount={post.likeCount}
                />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount} bình luận
                </span>
                <span className="ml-auto">
                  <ForumReportButton postId={post.id} />
                </span>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.05} className="mt-6">
            <h2 className="mb-3 text-base font-bold text-ink">
              Bình luận ({post.commentCount})
            </h2>
            <div className="flex flex-col gap-3">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-border-c bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Avatar size={20} />
                    <span className="font-semibold text-ink">{comment.authorName}</span>
                    <span className="text-muted">
                      {comment.createdAt.toLocaleDateString("vi-VN")}
                    </span>
                    <span className="ml-auto">
                      <ForumReportButton commentId={comment.id} />
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-ink/90">
                    {comment.content}
                  </p>
                </div>
              ))}
              {post.comments.length === 0 && (
                <p className="rounded-xl border border-dashed border-border-c bg-surface-alt p-6 text-center text-sm text-muted">
                  Chưa có bình luận nào — hãy là người đầu tiên.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mt-4">
            <ForumCommentForm postId={post.id} />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
