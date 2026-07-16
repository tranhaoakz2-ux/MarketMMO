"use client";

import { Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LegalNotice from "./LegalNotice";
import Reveal from "./Reveal";

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7c.2 1 1 1.8 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.3a2.9 2.9 0 0 0 2-2c.4-1.5.4-4.7.4-4.7ZM10 15V9l5.2 3-5.2 3Z" />
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
  return (
    <footer className="bg-surface-alt">
      <Reveal>
        <LegalNotice />
      </Reveal>

      <div className="bg-ink text-white">
        <Reveal>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40">
                  <Image
                    src="/logo-mark.png"
                    alt="MarketMMO"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                </span>
                <h3 className="text-lg font-black">
                  MARKET<span className="text-brand">MMO</span>.PRO
                </h3>
              </div>
              <p className="mt-3 max-w-xs text-sm text-white/60">
                Nền tảng nhằm kết nối, trao đổi, mua bán trong cộng đồng kiếm
                tiền online.
              </p>
              <p className="mt-5 text-sm font-bold">Theo dõi chúng tôi</p>
              <div className="mt-2 flex gap-2">
                <a
                  href="#"
                  aria-label="Facebook"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] transition hover:opacity-90"
                >
                  <span className="text-sm font-black">f</span>
                </a>
                <a
                  href="#"
                  aria-label="YouTube"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#FF0000] transition hover:opacity-90"
                >
                  <YoutubeIcon />
                </a>
                <a
                  href="#"
                  aria-label="TikTok"
                  className="grid h-9 w-9 place-items-center rounded-full bg-black transition hover:opacity-90"
                >
                  <Music2 className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-brand">
                Đăng ký bán hàng
              </h4>
              <p className="mt-3 max-w-xs text-sm text-white/60">
                Trở thành đối tác của MarketMMO.PRO để tiếp cận hàng ngàn
                khách hàng và tối ưu doanh thu của bạn.
              </p>
              <Link
                href="/tro-thanh-nguoi-ban"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-brand-dark"
              >
                Đăng ký ngay →
              </Link>
            </div>

            <div>
              <h4 className="text-lg font-bold">Hỗ Trợ Khách Hàng</h4>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-white/60">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition hover:text-brand">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © 2026 MARKETMMO.PRO. Tất cả quyền được bảo lưu.
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-6">
        <a
          href="#"
          aria-label="Nhắn tin Zalo"
          className="h-[57px] w-[57px] shrink-0 rounded-full shadow-lg transition hover:scale-105"
        >
          <Image src="/support-zalo.png" alt="" width={57} height={57} className="h-full w-full" />
        </a>
        <a
          href="#"
          aria-label="Nhắn tin Messenger"
          className="h-[57px] w-[57px] shrink-0 rounded-full shadow-lg transition hover:scale-105"
        >
          <Image src="/support-messenger.png" alt="" width={57} height={57} className="h-full w-full" />
        </a>
        <a
          href="#"
          aria-label="Gọi điện hỗ trợ"
          className="h-[57px] w-[57px] shrink-0 rounded-full shadow-lg transition hover:scale-105"
        >
          <Image src="/support-phone.png" alt="" width={57} height={57} className="h-full w-full" />
        </a>

        <div className="h-px w-8 bg-border-c/60" />

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Lên đầu trang"
          className="h-[57px] w-[57px] shrink-0 rounded-full shadow-lg transition hover:scale-105"
        >
          <Image src="/support-arrow-up.png" alt="" width={57} height={57} className="h-full w-full" />
        </button>
      </div>
    </footer>
  );
}
