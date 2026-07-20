import { prisma } from "@/lib/prisma";

function authorName(user: { name: string | null; username: string | null }) {
  return user.name ?? user.username ?? "Người dùng";
}

function excerpt(content: string, length = 140): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length).trim()}…` : flat;
}

export async function getForumPosts() {
  const posts = await prisma.forumPost.findMany({
    where: { hidden: false },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, username: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: excerpt(p.content),
    category: p.category,
    createdAt: p.createdAt,
    authorName: authorName(p.author),
    commentCount: p._count.comments,
    likeCount: p._count.likes,
  }));
}

export async function getRecentForumPosts(limit = 4) {
  const posts = await getForumPosts();
  return posts.slice(0, limit);
}

export async function getForumPostById(id: string, currentUserId?: string) {
  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, username: true } },
      likes: currentUserId ? { where: { userId: currentUserId } } : false,
      comments: {
        where: { hidden: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, username: true } } },
      },
      _count: { select: { comments: { where: { hidden: false } }, likes: true } },
    },
  });
  // Bài viết bị admin ẩn sau khi xử lý báo cáo (Admin > Diễn đàn) coi như
  // không tồn tại với người dùng thường — chỉ khác PENDING sản phẩm/danh mục
  // ở chỗ không có trạng thái "chờ duyệt", chỉ có hiện/ẩn.
  if (!post || post.hidden) return null;

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category,
    createdAt: post.createdAt,
    authorName: authorName(post.author),
    commentCount: post._count.comments,
    likeCount: post._count.likes,
    likedByMe: currentUserId ? post.likes.length > 0 : false,
    comments: post.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorName: authorName(c.author),
    })),
  };
}
