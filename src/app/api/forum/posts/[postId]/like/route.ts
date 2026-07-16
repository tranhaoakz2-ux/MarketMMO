import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { postId } = await params;
  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  }

  const userId = session!.user.id;
  const existing = await prisma.forumLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.forumLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumLike.create({ data: { postId, userId } });
  }

  const likeCount = await prisma.forumLike.count({ where: { postId } });

  return NextResponse.json({ liked: !existing, likeCount });
}
