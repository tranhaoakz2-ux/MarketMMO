import { NextResponse } from "next/server";
import { getSiteConfigValue } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";

// Đọc PUBLIC — không cần đăng nhập. Chỉ trả đúng các field Header/Footer
// (Client Component, dùng ở mọi trang, không prop-drill được từ Server
// Component) cần để hiển thị ticker/liên hệ — KHÔNG trả bất kỳ field nào
// khác của SiteConfig để giữ payload nhỏ.
export const dynamic = "force-dynamic";

export async function GET() {
  const [tickerText, facebook, youtube, tiktok, zalo, messenger, phone, telegram, admin] = await Promise.all([
    getSiteConfigValue("header_ticker_text"),
    getSiteConfigValue("footer_facebook_url"),
    getSiteConfigValue("footer_youtube_url"),
    getSiteConfigValue("footer_tiktok_url"),
    getSiteConfigValue("footer_zalo_url"),
    getSiteConfigValue("footer_messenger_url"),
    getSiteConfigValue("footer_phone"),
    getSiteConfigValue("footer_telegram_url"),
    // Admin ĐẦU TIÊN theo thời gian tạo tài khoản — dùng làm đích "Chat với
    // admin" nổi ở footer (xem Footer.tsx). Chỉ trả id (cuid, không nhạy
    // cảm) — KHÔNG trả email/tên để giữ payload public tối thiểu.
    prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);

  return NextResponse.json({
    tickerText,
    footer: {
      facebookUrl: facebook || null,
      youtubeUrl: youtube || null,
      tiktokUrl: tiktok || null,
      zaloUrl: zalo || null,
      messengerUrl: messenger || null,
      phone: phone || null,
      telegramUrl: telegram || null,
    },
    adminUserId: admin?.id ?? null,
  });
}
