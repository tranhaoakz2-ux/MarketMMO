import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { FORUM_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const category = FORUM_CATEGORIES.includes(body?.category) ? body.category : "Chia sẻ";

  if (title.length < 5 || title.length > 200) {
    return NextResponse.json(
      { error: "Tiêu đề phải từ 5 đến 200 ký tự." },
      { status: 400 }
    );
  }
  if (content.length < 10 || content.length > 5000) {
    return NextResponse.json(
      { error: "Nội dung phải từ 10 đến 5000 ký tự." },
      { status: 400 }
    );
  }

  const post = await prisma.forumPost.create({
    data: { title, content, category, authorId: session!.user.id },
  });

  return NextResponse.json({ id: post.id });
}
