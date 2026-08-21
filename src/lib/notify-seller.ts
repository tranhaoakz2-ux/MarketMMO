import { sendTelegramMessage } from "@/lib/telegram";

// Thông báo seller khi 1 sản phẩm/phiên bản vừa hết hàng (stock chạm 0) —
// dùng LẠI nguyên cơ chế Telegram Bot đã có (Trang Bán Hàng > Telegram Bot),
// KHÔNG dựng notification/inbox mới. Best-effort: seller chưa liên kết
// Telegram (telegramChatId=null) hoặc gửi lỗi thì bỏ qua im lặng — không bao
// giờ làm fail luồng gọi nó (checkout không được phép rollback vì lý do
// thông báo thất bại).
export async function notifySellerOutOfStock(
  seller: { telegramChatId: string | null; telegramLinkCode: string | null },
  productName: string
): Promise<void> {
  if (!seller.telegramChatId || seller.telegramLinkCode) return; // chưa liên kết xong
  try {
    await sendTelegramMessage(
      seller.telegramChatId,
      `Sản phẩm "${productName}" đã hết hàng — vào Quản Lý Bán Hàng > Sản phẩm để thêm kho.`
    );
  } catch {
    // Không chặn checkout vì lý do thông báo thất bại — im lặng bỏ qua.
  }
}
