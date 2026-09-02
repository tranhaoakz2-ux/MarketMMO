import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BackgroundLayer from "@/components/BackgroundLayer";
import Providers from "@/components/Providers";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "MaketMMO — Sàn giao dịch tài khoản & vật phẩm MMO uy tín";
const DESCRIPTION =
  "MaketMMO là marketplace mua bán tài khoản số, vật phẩm/tiền tệ MMO và dịch vụ boosting, giao dịch ký quỹ an toàn, giao hàng tự động 24/7.";

export const metadata: Metadata = {
  // Resolve URL tương đối (canonical/OG image...) thành tuyệt đối ở mọi
  // trang con không tự khai báo metadataBase riêng.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: "vi_VN",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
};

// Chống FOUC (nháy sáng): chạy TRƯỚC khi trang paint + trước khi React hydrate,
// đọc localStorage và set data-theme lên <html> ngay. Mặc định "light" khi chưa
// chọn (KHÔNG tự theo prefers-color-scheme). Vì attribute này do script set
// (không nằm trong JSX), <html> cần suppressHydrationWarning để React không cảnh
// báo lệch server/client.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <BackgroundLayer />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
