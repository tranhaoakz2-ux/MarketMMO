// Tích hợp Telegram Bot (Quản Lý Bán Hàng > Telegram Bot) — cùng quy ước
// env-var-gated như VNPay (src/lib/payment/vnpay.ts): thiếu TELEGRAM_BOT_TOKEN
// thì mọi API liên quan tự trả lỗi rõ ràng, không chặn phần còn lại của app.
//
// Luồng liên kết KHÔNG cần webhook công khai (khó test ở dev local) — seller
// tự lấy Chat ID của mình (nhắn bot bất kỳ như @userinfobot), nhập vào form,
// server gọi sendMessage gửi 1 mã xác nhận 6 số tới đúng Chat ID đó, seller
// nhập lại mã để xác nhận đúng là Chat ID của mình. Chỉ cần gọi API Telegram
// một chiều (outbound), không cần nhận webhook.

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Telegram Bot chưa được cấu hình (thiếu TELEGRAM_BOT_TOKEN).");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.description || "Gửi tin nhắn Telegram thất bại.");
  }
}

export function generateLinkCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
