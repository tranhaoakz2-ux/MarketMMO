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

// Cách B: 1 disputeId chỉ hợp lệ trong hội thoại của ĐÚNG cặp buyer↔seller của
// đơn bị khiếu nại đó. Chặn 1 người tự gắn disputeId của đơn không liên quan
// (defense-in-depth) — ngoài việc loadOwnedConversation đã xác thực người gọi
// là 1 trong 2 người tham gia hội thoại.
async function disputeBelongsToPair(
  disputeId: string,
  conversation: { userAId: string; userBId: string }
): Promise<boolean> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { orderItem: { select: { sellerId: true, order: { select: { buyerId: true } } } } },
  });
  if (!dispute) return false;
  const seller = await prisma.seller.findUnique({
    where: { id: dispute.orderItem.sellerId },
    select: { userId: true },
  });
  if (!seller) return false;
  const pair = new Set([dispute.orderItem.order.buyerId, seller.userId]);
  return pair.has(conversation.userAId) && pair.has(conversation.userBId);
}

export async function GET(
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

  // ?disputeId=<id> -> chỉ tin của luồng khiếu nại đó; không có -> chat CHUNG
  // (disputeId = null). Hai luồng KHÔNG bao giờ trộn nhau (Cách B).
  const disputeId = new URL(req.url).searchParams.get("disputeId");
  if (disputeId && !(await disputeBelongsToPair(disputeId, conversation))) {
    return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
  }
  const scope = { disputeId: disputeId ?? null };

  const [messages, bot] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: id, ...scope },
      orderBy: { createdAt: "asc" },
    }),
    getSystemBotUser(),
  ]);

  // Đánh dấu đã đọc mọi tin của người kia TRONG ĐÚNG luồng đang xem (chung
  // hoặc khiếu nại) — không đụng tin của luồng còn lại.
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, readAt: null, ...scope },
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

  // disputeId (tuỳ chọn): tin thuộc luồng khiếu nại. Kiểm tra thuộc đúng cặp
  // buyer↔seller của hội thoại (nếu không -> 404, chặn gắn đơn không liên quan).
  const disputeIdRaw = form.get("disputeId");
  const disputeId = typeof disputeIdRaw === "string" && disputeIdRaw ? disputeIdRaw : null;
  if (disputeId && !(await disputeBelongsToPair(disputeId, conversation))) {
    return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
  }

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

  const data = {
    conversationId: id,
    senderId: userId,
    content,
    attachmentPath: attachment?.path,
    attachmentName: attachment?.name,
    attachmentType: attachment?.type,
    disputeId,
  };

  // Tin CHUNG (disputeId null): tạo tin + đẩy lastMessageAt (hội thoại lên đầu
  // danh sách chat chung), giữ NGUYÊN hành vi cũ. Tin KHIẾU NẠI: chỉ tạo tin,
  // KHÔNG cập nhật lastMessageAt để danh sách chat chung không bị xáo trộn bởi
  // luồng khiếu nại (Cách B).
  const message = disputeId
    ? await prisma.message.create({ data })
    : (
        await prisma.$transaction([
          prisma.message.create({ data }),
          prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } }),
        ])
      )[0];

  return NextResponse.json({ id: message.id, createdAt: message.createdAt });
}
