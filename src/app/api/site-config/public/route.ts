import { NextResponse } from "next/server";
import { getSiteConfigValue } from "@/lib/site-config";

// Đọc PUBLIC — không cần đăng nhập. Chỉ trả đúng các field Header/Footer
// (Client Component, dùng ở mọi trang, không prop-drill được từ Server
// Component) cần để hiển thị ticker/liên hệ — KHÔNG trả bất kỳ field nào
// khác của SiteConfig để giữ payload nhỏ.
export const dynamic = "force-dynamic";

export async function GET() {
  const [tickerText, facebook, youtube, tiktok, zalo, messenger, phone] = await Promise.all([
    getSiteConfigValue("header_ticker_text"),
    getSiteConfigValue("footer_facebook_url"),
    getSiteConfigValue("footer_youtube_url"),
    getSiteConfigValue("footer_tiktok_url"),
    getSiteConfigValue("footer_zalo_url"),
    getSiteConfigValue("footer_messenger_url"),
    getSiteConfigValue("footer_phone"),
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
    },
  });
}
