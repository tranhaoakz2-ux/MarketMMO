import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getOrCreateConversation, getSystemBotUser } from "@/lib/system-bot";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const [conversations, bot] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        userA: { select: { id: true, name: true, username: true, email: true } },
        userB: { select: { id: true, name: true, username: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, attachmentType: true },
        },
      },
    }),
    getSystemBotUser(),
  ]);

  const unreadCounts = conversations.length
    ? await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          conversationId: { in: conversations.map((c) => c.id) },
          senderId: { not: userId },
          readAt: null,
        },
        _count: { id: true },
      })
    : [];
  const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count.id]));

  const otherUserIds = conversations.map((conv) =>
    conv.userAId === userId ? conv.userBId : conv.userAId
  );
  const sellers = otherUserIds.length
    ? await prisma.seller.findMany({
        where: { userId: { in: otherUserIds } },
        select: { userId: true, slug: true },
      })
    : [];
  const sellerSlugMap = new Map(sellers.map((s) => [s.userId, s.slug]));

  const result = conversations.map((conv) => {
    const other = conv.userAId === userId ? conv.userB : conv.userA;
    const last = conv.messages[0];
    const lastMessage = last
      ? last.content ||
        (last.attachmentType === "IMAGE" ? "[Hình ảnh]" : last.attachmentType === "FILE" ? "[Tệp đính kèm]" : null)
      : null;
    return {
      id: conv.id,
      otherUser: {
        id: other.id,
        name: other.name ?? other.username ?? other.email ?? "Người dùng",
        isSystemBot: other.id === bot.id,
        sellerSlug: sellerSlugMap.get(other.id) ?? null,
      },
      lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    };
  });

  return NextResponse.json({ conversations: result });
}

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : "";
  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu targetUserId." }, { status: 400 });
  }
  if (targetUserId === session!.user.id) {
    return NextResponse.json({ error: "Không thể tự nhắn tin cho chính mình." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    return NextResponse.json({ error: "Người dùng không tồn tại." }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(session!.user.id, targetUserId);
  return NextResponse.json({ id: conversation.id });
}
