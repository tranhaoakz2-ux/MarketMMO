import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSystemBotUser } from "@/lib/system-bot";
import { saveChatAttachment } from "@/lib/uploads";

async function loadOwnedConversation(userId: string, id: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return null;
  if (conversation.userAId !== userId && conversation.userBId !== userId) return null;
  return conversation;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { id } = await params;
  const conversation = await loadOwnedConversation(userId, id);
  if (!conversation) {
    return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
  }

  const [messages, bot] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    }),
    getSystemBotUser(),
  ]);

  // Đánh dấu đã đọc mọi tin của người kia khi user hiện tại xem hội thoại.
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

  return NextResponse.json({
    id: conversation.id,
    otherUserId,
    isSystemBot: otherUserId === bot.id,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      attachment: m.attachmentPath
        ? {
            url: `/api/messages/attachments/${m.id}`,
            name: m.attachmentName,
            type: m.attachmentType,
          }
        : null,
      createdAt: m.createdAt,
      isMine: m.senderId === userId,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { id } = await params;
  const conversation = await loadOwnedConversation(userId, id);
  if (!conversation) {
    return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const content = String(form.get("content") ?? "").trim().slice(0, 2000);
  const file = form.get("file");

  let attachment: { path: string; type: "IMAGE" | "FILE"; name: string } | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      attachment = await saveChatAttachment(id, file);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải file lên.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!content && !attachment) {
    return NextResponse.json(
      { error: "Vui lòng nhập nội dung hoặc đính kèm ảnh/file." },
      { status: 400 }
    );
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content,
        attachmentPath: attachment?.path,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
      },
    }),
    prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return NextResponse.json({ id: message.id, createdAt: message.createdAt });
}
