import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Buyer-facing: báo cáo 1 bài viết HOẶC 1 bình luận vi phạm — đúng 1 trong 2
// id phải có mặt. Admin xử lý tại Admin > Diễn đàn (POST
// /api/admin/forum-reports/[id]).
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId : null;
  const commentId = typeof body?.commentId === "string" ? body.commentId : null;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";

  if ((!postId && !commentId) || (postId && commentId)) {
    return NextResponse.json({ error: "Cần đúng 1 trong 2: bài viết hoặc bình luận." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Vui lòng nhập lý do báo cáo." }, { status: 400 });
  }

  if (postId) {
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  } else if (commentId) {
    const comment = await prisma.forumComment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
  }

  try {
    await prisma.forumReport.create({
      data: { postId, commentId, reporterId: session!.user!.id, reason },
    });
  } catch (err) {
    // Unique (reporterId, postId/commentId): user đã báo cáo mục này rồi. Chống
    // spam ngập hàng chờ kiểm duyệt — trả 409 thân thiện thay vì 500 (AUDIT.md #4).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Bạn đã báo cáo nội dung này rồi. Cảm ơn bạn!" },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
