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
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (content.length < 2 || content.length > 1000) {
    return NextResponse.json(
      { error: "Bình luận phải từ 2 đến 1000 ký tự." },
      { status: 400 }
    );
  }

  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  }

  const comment = await prisma.forumComment.create({
    data: { postId, content, authorId: session!.user.id },
  });

  return NextResponse.json({ id: comment.id });
}
