import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateLinkCode, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

export async function GET() {
  const { seller, error } = await requireSeller();
  if (error) return error;

  return NextResponse.json({
    configured: isTelegramConfigured(),
    linked: Boolean(seller!.telegramChatId && !seller!.telegramLinkCode),
    pending: Boolean(seller!.telegramChatId && seller!.telegramLinkCode),
    chatId: seller!.telegramChatId,
  });
}

export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram Bot chưa được cấu hình (thiếu TELEGRAM_BOT_TOKEN trong .env)." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  // Rate-limit các hành động GỬI tin ra Telegram (link/test) — chặn seller spam
  // tin nhắn tới chatId tuỳ ý (xem AUDIT.md #5). Không giới hạn confirm/unlink
  // (chỉ đọc/ghi DB, không gửi ra ngoài).
  if (action === "link" || action === "test") {
    const rl = rateLimit(`telegram-send:${seller!.id}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Bạn gửi quá nhiều lần. Vui lòng thử lại sau ${rl.retryAfterSec} giây.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
  }

  if (action === "link") {
    const chatId = typeof body?.chatId === "string" ? body.chatId.trim() : "";
    if (!/^-?\d+$/.test(chatId)) {
      return NextResponse.json({ error: "Chat ID không hợp lệ (chỉ gồm số)." }, { status: 400 });
    }
    const linkCode = generateLinkCode();

    try {
      await sendTelegramMessage(
        chatId,
        `Mã xác nhận liên kết MarketMMO của bạn là: ${linkCode}\n\nNhập mã này vào Quản Lý Bán Hàng > Telegram Bot để hoàn tất liên kết.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gửi tin nhắn Telegram.";
      return NextResponse.json(
        { error: `${message} Kiểm tra lại Chat ID và đảm bảo bạn đã nhắn /start cho bot trước.` },
        { status: 400 }
      );
    }

    await prisma.seller.update({
      where: { id: seller!.id },
      data: { telegramChatId: chatId, telegramLinkCode: linkCode },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm") {
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!seller!.telegramLinkCode || !seller!.telegramChatId) {
      return NextResponse.json(
        { error: "Bạn chưa yêu cầu liên kết Telegram." },
        { status: 400 }
      );
    }
    if (code !== seller!.telegramLinkCode) {
      return NextResponse.json({ error: "Mã xác nhận không đúng." }, { status: 400 });
    }
    await prisma.seller.update({
      where: { id: seller!.id },
      data: { telegramLinkCode: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unlink") {
    await prisma.seller.update({
      where: { id: seller!.id },
      data: { telegramChatId: null, telegramLinkCode: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "test") {
    if (!seller!.telegramChatId || seller!.telegramLinkCode) {
      return NextResponse.json(
        { error: "Bạn cần liên kết Telegram trước khi gửi thử." },
        { status: 400 }
      );
    }
    try {
      await sendTelegramMessage(
        seller!.telegramChatId,
        `Xin chào ${seller!.shopName}! Đây là tin nhắn thử từ MarketMMO — kết nối Telegram Bot của bạn đang hoạt động tốt.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gửi tin nhắn thử thất bại.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
