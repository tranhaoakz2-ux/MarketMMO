import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  const report = await prisma.forumReport.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Không tìm thấy báo cáo." }, { status: 404 });
  }
  if (report.status !== "OPEN") {
    return NextResponse.json({ error: "Báo cáo này đã được xử lý." }, { status: 400 });
  }

  if (action === "hide") {
    if (report.postId) {
      await prisma.forumPost.update({ where: { id: report.postId }, data: { hidden: true } });
    } else if (report.commentId) {
      await prisma.forumComment.update({ where: { id: report.commentId }, data: { hidden: true } });
    }
    await prisma.forumReport.update({ where: { id }, data: { status: "RESOLVED_HIDDEN" } });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Ẩn nội dung diễn đàn bị báo cáo",
      targetType: report.postId ? "ForumPost" : "ForumComment",
      targetId: report.postId ?? report.commentId ?? undefined,
      detail: report.reason,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "dismiss") {
    await prisma.forumReport.update({ where: { id }, data: { status: "RESOLVED_DISMISSED" } });
    await logAdminAction({
      adminId: session!.user!.id,
      action: "Bỏ qua báo cáo diễn đàn",
      targetType: report.postId ? "ForumPost" : "ForumComment",
      targetId: report.postId ?? report.commentId ?? undefined,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
