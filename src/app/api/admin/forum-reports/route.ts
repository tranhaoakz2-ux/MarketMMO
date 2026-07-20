import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const reports = await prisma.forumReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { name: true, username: true, email: true } },
      post: { select: { id: true, title: true, content: true, hidden: true } },
      comment: {
        select: {
          id: true,
          content: true,
          hidden: true,
          postId: true,
          post: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt,
      reporterName: r.reporter.name ?? r.reporter.username ?? r.reporter.email ?? "—",
      type: r.postId ? ("POST" as const) : ("COMMENT" as const),
      targetTitle: r.post?.title ?? r.comment?.post.title ?? "—",
      targetContent: r.post?.content ?? r.comment?.content ?? "",
      targetHidden: r.post?.hidden ?? r.comment?.hidden ?? false,
      postId: r.postId,
      commentId: r.commentId,
    })),
  });
}
