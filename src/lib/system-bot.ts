import { cache } from "react";
import { prisma } from "@/lib/prisma";

const SYSTEM_BOT_EMAIL = "system@marketmmo.internal";
export const SYSTEM_BOT_NAME = "Hệ Thống";

// Bot "Hệ Thống" chỉ là 1 User bình thường (role mặc định BUYER, không có
// passwordHash nên không đăng nhập được) — không thêm role "SYSTEM" riêng
// vào Role union để tránh thay đổi schema không cần thiết. Lazy-init đúng
// pattern src/lib/referral.ts (upsert theo email cố định, không backfill
// qua migration vì dự án dùng `prisma db push`).
export const getSystemBotUser = cache(async () => {
  return prisma.user.upsert({
    where: { email: SYSTEM_BOT_EMAIL },
    update: {},
    create: {
      email: SYSTEM_BOT_EMAIL,
      username: "he_thong",
      name: SYSTEM_BOT_NAME,
      walletBalance: 0,
    },
  });
});

function sortUserPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

export async function getOrCreateConversation(userId1: string, userId2: string) {
  const [userAId, userBId] = sortUserPair(userId1, userId2);
  return prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });
}

// Điểm mở rộng: gọi hàm này từ bất kỳ sự kiện nào khác muốn thông báo qua
// chat (nạp tiền được duyệt, đơn hàng giải ngân...) — hiện chỉ 2 nơi gọi:
// đăng ký tài khoản và đăng ký bán hàng (xem CLAUDE.md).
export async function sendSystemMessage(userId: string, content: string): Promise<void> {
  const bot = await getSystemBotUser();
  const conversation = await getOrCreateConversation(bot.id, userId);
  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: bot.id, content },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);
}
