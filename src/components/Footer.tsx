"use client";

import { ArrowUp, MessageCircle, Music2, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import LegalNotice from "./LegalNotice";
import Reveal from "./Reveal";

type FooterContacts = {
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  zaloUrl: string | null;
  messengerUrl: string | null;
  phone: string | null;
  telegramUrl: string | null;
};

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7c.2 1 1 1.8 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.3a2.9 2.9 0 0 0 2-2c.4-1.5.4-4.7.4-4.7ZM10 15V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

// Logo Zalo/Messenger chính thức dạng vector — path lấy từ bộ Simple Icons
// (simpleicons.org, artwork cấp phép CC0-1.0, dùng logo thương hiệu vẫn cần
// tuân thủ quy định riêng của từng hãng). Thay cho ảnh PNG 64x64 cũ: ảnh cũ
// vỡ nét vì (1) chỉ 64x64px gốc trong khi hiển thị ở khung 57px CSS — trên
// màn hình retina (devicePixelRatio 2-3) cần tới 114-171px thật mới đủ nét,
// và (2) bản thân ảnh vốn cắt ra từ 1 ảnh chụp màn hình chất lượng thấp (đã
// mờ sẵn ở nguồn). SVG là vector nên luôn sắc nét ở MỌI độ phân giải, không
// còn phụ thuộc kích thước ảnh nguồn — và giữ đúng hình dạng logo gốc thay
// vì tự vẽ lại gần đúng.
function ZaloIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#fff" aria-hidden>
      <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#fff" aria-hidden>
      <path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" />
    </svg>
  );
}

// Logo Telegram — cùng nguồn/lý do vector hoá với ZaloIcon/MessengerIcon ở
// trên (Simple Icons, CC0-1.0). fill="currentColor" ăn theo màu chữ của nút
// cha (text-white — nền xanh Telegram #229ED9 chính thức, tách riêng khỏi
// nút "Chat với admin" cạnh bên vẫn giữ tông vàng thương hiệu).
function TelegramIcon() {
  return (
    // h-10 w-10 (+25% so với h-8 w-8 các icon khác trong cụm) — riêng icon
    // máy bay giấy Telegram có nhiều khoảng trống rìa trong path gốc nên ở
    // cùng cỡ 32px trông nhỏ hơn hẳn Zalo/Messenger, cần phóng to bù lại.
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.357 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const supportLinks = [
  { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
  { label: "Tài liệu tích hợp API", href: "/tai-lieu-api" },
  { label: "Điều khoản dịch vụ", href: "/dieu-khoan-dich-vu" },
  { label: "Điều khoản bán hàng", href: "/dieu-khoan-ban-hang" },
  { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
  { label: "Sitemap", href: "/sitemap-trang-web" },
];

export default function Footer() {
  // Liên hệ admin sửa qua /admin/noi-dung (SiteConfig.footer_*) — mặc định
  // chưa cấu hình gì (khớp DEFAULTS rỗng trong src/lib/site-config.ts) nên
  // icon liên quan ẨN HẲN thay vì link chết "#" như trước, chỉ hiện sau khi
  // fetch xong VÀ admin đã nhập link/SĐT thật.
  const [contacts, setContacts] = useState<FooterContacts | null>(null);
  // Admin đầu tiên trong hệ thống — đích của nút "Chat với admin" nổi, xem
  // GET /api/site-config/public. null = chưa tải xong HOẶC không có admin
  // nào (2 trường hợp đều ẨN nút, không phân biệt — tránh nút chết).
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    let active = true;
    fetch("/api/site-config/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.footer) setContacts(data.footer);
        if (data.adminUserId) setAdminUserId(data.adminUserId);
      });
    return () => {
      active = false;
    };
  }, []);

  // Chính admin đó tự xem site thì ẩn nút (không tự chat với chính mình).
  const showChatAdmin = adminUserId && session?.user?.id !== adminUserId;
  const chatTarget = `/tin-nhan?with=${adminUserId}`;
  const chatHref = session?.user
    ? chatTarget
    : `/dang-nhap?callbackUrl=${encodeURIComponent(chatTarget)}`;

  return (
    <footer className="bg-surface-alt">
      <Reveal>
        <LegalNotice />
      </Reveal>

      <div className="border-t-4 border-brand bg-ink text-white">
        <Reveal>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 md:divide-x md:divide-white/10 lg:px-8">
            <div className="md:pr-10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 shrink-0 items-center rounded-lg bg-brand px-2 shadow-sm">
                  <Image
                    src="/logo-mark.png"
                    alt="MarketMMO"
                    width={35}
                    height={28}
                    className="h-7 w-auto object-contain"
                  />
                </span>
                <h3 className="text-lg font-black">
                  MARKET<span className="text-brand">MMO</span>.VN
                </h3>
              </div>
              <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-white/60">
                Nền tảng nhằm kết nối, trao đổi, mua bán trong cộng đồng kiếm
                tiền online.
              </p>
              {(contacts?.facebookUrl || contacts?.youtubeUrl || contacts?.tiktokUrl) && (
                <>
                  <p className="mb-2.5 mt-6 text-xs font-black uppercase tracking-wide text-white/70">
                    Theo dõi chúng tôi
                  </p>
                  <div className="flex gap-2.5">
                    {contacts?.facebookUrl && (
                      <a
                        href={contacts.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className="text-sm font-black">f</span>
                      </a>
                    )}
                    {contacts?.youtubeUrl && (
                      <a
                        href={contacts.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="grid h-9 w-9 place-items-center rounded-full bg-[#FF0000] transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <YoutubeIcon />
                      </a>
                    )}
                    {contacts?.tiktokUrl && (
                      <a
                        href={contacts.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="TikTok"
                        className="grid h-9 w-9 place-items-center rounded-full bg-black transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <Music2 className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="md:px-10">
              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand">
                <span className="h-1.5 w-5 rounded-full bg-brand" />
                Đăng ký bán hàng
              </h4>
              <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-white/60">
                Trở thành đối tác của marketmmo.vn để tiếp cận hàng ngàn
                khách hàng và tối ưu doanh thu của bạn.
              </p>
              <Link
                href="/tro-thanh-nguoi-ban"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
              >
                Đăng ký ngay →
              </Link>
            </div>

            <div className="md:pl-10">
              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-5 rounded-full bg-brand" />
                Hỗ Trợ Khách Hàng
              </h4>
              <ul className="mt-3.5 flex flex-col gap-2.5 text-sm text-white/60">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © 2026 MARKETMMO.VN. Tất cả quyền được bảo lưu.
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-6">
        {contacts?.zaloUrl && (
          <a
            href={contacts.zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn tin Zalo"
            className="group grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#0290E3] shadow-lg transition hover:scale-110 hover:shadow-xl"
          >
            <span className="motion-safe:group-hover:animate-[icon-bounce_0.6s_ease-in-out]">
              <ZaloIcon />
            </span>
          </a>
        )}
        {contacts?.messengerUrl && (
          <a
            href={contacts.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn tin Messenger"
            className="group grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#0083FE] shadow-lg transition hover:scale-110 hover:shadow-xl"
          >
            <span className="motion-safe:group-hover:animate-[spin_0.6s_ease-in-out]">
              <MessengerIcon />
            </span>
          </a>
        )}
        {contacts?.phone && (
          <a
            href={`tel:${contacts.phone}`}
            aria-label="Gọi điện hỗ trợ"
            className="group grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#fe470f] via-[#d60428] to-[#a91663] shadow-lg transition hover:scale-110 hover:shadow-xl"
          >
            <Phone
              className="h-8 w-8 origin-top text-white motion-safe:group-hover:animate-[bell-ring_0.6s_ease-in-out]"
              strokeWidth={2}
            />
          </a>
        )}

        {/* Chat với admin (hệ thống tin nhắn thật /tin-nhan, cùng Conversation/
            Message dùng cho buyer-seller) + Telegram — 2 nút mới, cùng kích
            thước với nút lên đầu trang. Chat admin dùng tông vàng thương
            hiệu; Telegram dùng đúng màu xanh nhận diện thương hiệu Telegram
            (#229ED9, không dùng vàng như trước) — tách riêng như
            Zalo/Messenger/Điện thoại ở trên đều giữ màu thương hiệu gốc. */}
        {showChatAdmin && (
          <div className="group/tip relative">
            <Link
              href={chatHref}
              aria-label="Chat trực tiếp với admin"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand shadow-lg transition hover:scale-110 hover:bg-brand-dark hover:shadow-xl"
            >
              <MessageCircle className="h-8 w-8 text-ink" strokeWidth={2} />
            </Link>
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tip:translate-x-0 group-hover/tip:opacity-100">
              Chat trực tiếp với admin
            </span>
          </div>
        )}
        {contacts?.telegramUrl && (
          <div className="group/tip relative">
            <a
              href={contacts.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Liên hệ qua Telegram"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#229ED9] text-white shadow-lg transition hover:scale-110 hover:bg-[#1B8AC4] hover:shadow-xl"
            >
              <TelegramIcon />
            </a>
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tip:translate-x-0 group-hover/tip:opacity-100">
              Liên hệ qua Telegram
            </span>
          </div>
        )}

        <div className="h-px w-8 bg-border-c/60" />

        {/* Nút lên đầu trang: trước dùng ảnh PNG 64x64 (cũng vỡ nét cùng lý
            do 3 nút trên) — giữ đúng style vòng tròn viền mảnh trong suốt của
            ảnh gốc bằng border thật, chỉ đổi mũi tên bên trong sang icon
            lucide-react (vector, luôn sắc nét). */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Lên đầu trang"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-muted/40 bg-surface shadow-lg transition hover:scale-110 hover:border-muted hover:shadow-xl"
        >
          <ArrowUp className="h-8 w-8 text-muted" strokeWidth={2} />
        </button>
      </div>
    </footer>
  );
}
