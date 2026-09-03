"use client";

import { LogOut, Menu, Search, ShoppingBag, User, Wallet, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import HeaderChatButton from "@/components/HeaderChatButton";
import MobileProductAccordion from "@/components/MobileProductAccordion";
import NavMegaMenu, { type MegaMenuItem } from "@/components/NavMegaMenu";
import ProductMegaMenu, { type CategoryMenuNode } from "@/components/ProductMegaMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { useCart } from "@/context/CartContext";
import { formatVnd } from "@/lib/format";
import { stripLeadingEmoji } from "@/lib/text";

// Phải khớp CHÍNH XÁC DEFAULTS.header_ticker_text trong src/lib/site-config.ts
// (state khởi tạo dùng giá trị này trước khi fetch xong, tránh flash nội dung).
const DEFAULT_TICKER_TEXT =
  "🔔 MAKETMMO — Mua bán sản phẩm số phục vụ kiếm tiền online. Mọi giao dịch trên sàn đều hoàn toàn tự động và được ký quỹ an toàn.";

const simpleNavLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Đơn Hàng", href: "/don-hang" },
  { label: "Lấy 2FA", href: "/lay-2fa" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Diễn đàn", href: "/dien-dan" },
];

const depositMenuItems: MegaMenuItem[] = [
  {
    label: "Nạp tiền ngay",
    href: "/nap-tien",
    icon: <Wallet className="h-5 w-5 text-brand-dark" strokeWidth={2.5} />,
  },
  {
    label: "Lịch sử giao dịch",
    href: "/nap-tien",
    icon: <User className="h-5 w-5 text-sky-600" strokeWidth={2.5} />,
  },
];

// "Trang chủ"/"Sản phẩm"/"Dịch vụ" tách riêng khỏi danh sách phẳng này —
// render tường minh trước, "Sản phẩm" qua MobileProductAccordion (cây động),
// "Dịch vụ" tính động từ categoryTree (xem serviceHref/serviceCategory trong
// component bên dưới) — giữ đúng thứ tự cũ (Trang chủ, Sản phẩm, Dịch vụ, ...).
const mobileNavLinks = [
  { label: "Nạp tiền", href: "/nap-tien" },
  { label: "Tin nhắn", href: "/tin-nhan" },
  { label: "Đơn Hàng", href: "/don-hang" },
  { label: "Lấy 2FA", href: "/lay-2fa" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Diễn đàn", href: "/dien-dan" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryTree, setCategoryTree] = useState<CategoryMenuNode[]>([]);
  const [tickerText, setTickerText] = useState(DEFAULT_TICKER_TEXT);
  const { totalCount } = useCart();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Cây danh mục cho dropdown "Sản phẩm" — fetch 1 lần lúc mount (không cần
  // poll lại như HeaderChatButton, category ít đổi), dùng chung cho cả bản
  // desktop (ProductMegaMenu) lẫn mobile (MobileProductAccordion) để không
  // gọi API 2 lần trên cùng 1 trang.
  useEffect(() => {
    let active = true;
    fetch("/api/categories/tree")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.tree) setCategoryTree(data.tree);
      });
    return () => {
      active = false;
    };
  }, []);

  // Ticker admin sửa qua /admin/noi-dung (SiteConfig.header_ticker_text) —
  // state khởi tạo SẴN đúng text mặc định hiện tại (khớp SSR, không giật/
  // không lệch hydration), chỉ âm thầm đổi nếu admin đã cấu hình khác.
  useEffect(() => {
    let active = true;
    fetch("/api/site-config/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.tickerText) setTickerText(data.tickerText);
      });
    return () => {
      active = false;
    };
  }, []);

  // Dropdown "Dịch vụ" ĐỘNG hoàn toàn từ CÙNG categoryTree đã fetch cho
  // "Sản phẩm" ở trên — KHÔNG còn mảng hardcode riêng (bug thật đã gặp:
  // "Dịch vụ" từng liệt kê Boosting/ChatGPT/YouTube... lệch hẳn với danh mục
  // con thật của nhóm cha "Dịch Vụ" trong DB). "dich-vu" là slug nhóm cha cố
  // định (admin đặt qua /admin/danh-muc) — đổi TÊN nhóm cha không ảnh hưởng
  // (chỉ đọc theo slug), thêm/bớt/sửa danh mục CON trong nhóm này tự phản
  // ánh ngay lần fetch categoryTree kế tiếp, không cần sửa code.
  // Không render icon/emoji ở đây nữa (kể cả Category.emoji riêng) — 1 số
  // category có emoji, 1 số không nên hiện lộn xộn, không đồng nhất. Chỉ
  // hiện CHỮ, và strip luôn emoji lỡ gõ thẳng vào đầu Category.name (khác
  // field emoji) để không lộ ra dù admin có đặt tên kiểu "🎵 TikTok" —
  // stripLeadingEmoji() chỉ xử lý lúc hiển thị, không đụng dữ liệu DB.
  const serviceCategory = categoryTree.find((c) => c.slug === "dich-vu");
  const serviceMenuItems: MegaMenuItem[] = (serviceCategory?.children ?? []).map((child) => ({
    label: stripLeadingEmoji(child.name),
    href: `/danh-muc/${child.slug}`,
  }));
  // Chưa fetch xong / nhóm cha "Dịch Vụ" chưa tồn tại -> rơi về "/danh-muc"
  // (trang tổng, giống hệt cách "Sản phẩm" xử lý) thay vì trỏ cứng vào 1
  // danh mục con cụ thể có thể không còn tồn tại.
  const serviceHref = serviceCategory ? `/danh-muc/${serviceCategory.slug}` : "/danh-muc";

  const isSeller =
    status === "authenticated" &&
    (session.user.role === "SELLER" || session.user.role === "ADMIN");
  const sellerBadgeHref = isSeller ? "/trang-ban-hang" : "/tro-thanh-nguoi-ban";
  const sellerBadgeLabel = isSeller ? "Quản Lý Bán Hàng" : "Đăng Ký Bán Hàng";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/tim-kiem?q=${encodeURIComponent(q)}` : "/tim-kiem");
    setMenuOpen(false);
  };

  return (
    <header className="caro-surface sticky top-0 z-50">
      <div className="hidden overflow-hidden bg-ink py-[3px] text-sm font-normal text-white/70 sm:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{tickerText}</div>
      </div>

      <div className="shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:h-[73px] sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
          <button
            className="rounded-lg p-2 text-foreground hover:bg-black/10 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[54px] items-center sm:h-[60px]">
              <Image
                src="/logo-mark.png"
                alt="MaketMMO"
                width={75}
                height={60}
                className="h-full w-auto object-contain"
                priority
              />
            </span>
            <span className="text-[26px] font-black tracking-tight text-foreground sm:text-[30px]">
              MAKET<span className="text-foreground">MMO</span>
            </span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="hidden flex-1 items-center justify-center sm:flex"
          >
            <div className="flex h-10 w-full items-center overflow-hidden rounded-full bg-white shadow-inner dark:bg-ink sm:max-w-[468px] lg:max-w-[528px]">
              <Search className="ml-3.5 h-4 w-4 shrink-0 text-foreground/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm sản phẩm hoặc người bán..."
                className="h-full w-full bg-transparent px-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
              />
              <button
                type="submit"
                className="hidden h-full shrink-0 items-center bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-4 text-white transition hover:brightness-110 sm:flex"
                aria-label="Tìm kiếm"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {status === "authenticated" && <HeaderChatButton />}
            <Link
              href="/gio-hang"
              className="relative flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-4 py-2 transition hover:brightness-110"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="h-5 w-5 text-white" />
              {totalCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {totalCount}
                </span>
              )}
            </Link>
          </div>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {status === "authenticated" ? (
              <>
                <Link
                  href="/nap-tien"
                  className="flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                >
                  <Wallet className="h-4 w-4 text-white" />
                  {formatVnd(session.user.walletBalance)}
                </Link>
                <AccountMenu
                  name={session.user.name ?? session.user.email ?? ""}
                  role={session.user.role}
                />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] p-2.5 text-white transition hover:brightness-110"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/dang-nhap"
                  className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-ink-soft"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-nhap?tab=register"
                  className="rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-foreground transition hover:bg-surface-alt dark:bg-ink"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>

          <form
            onSubmit={handleSearch}
            className="order-last flex h-10 w-full items-center overflow-hidden rounded-full bg-white shadow-inner dark:bg-ink sm:hidden"
          >
            <Search className="ml-3.5 h-4 w-4 shrink-0 text-foreground/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm sản phẩm hoặc người bán..."
              className="h-full w-full bg-transparent px-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
            <button
              type="submit"
              className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] text-white transition hover:brightness-110"
              aria-label="Tìm kiếm"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="hidden border-b border-border-c lg:block">
        <nav className="mx-auto flex h-[50px] max-w-7xl items-center gap-6 px-4 text-base font-semibold text-foreground/80 sm:px-6 lg:px-8">
          <Link href="/" className="whitespace-nowrap transition hover:text-brand-dark">
            Trang chủ
          </Link>
          <ProductMegaMenu tree={categoryTree} />
          <NavMegaMenu label="Dịch vụ" href={serviceHref} items={serviceMenuItems} />
          <NavMegaMenu label="Nạp tiền" href="/nap-tien" items={depositMenuItems} />
          {simpleNavLinks.slice(1).map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="whitespace-nowrap transition hover:text-brand-dark"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={sellerBadgeHref}
            className="ml-auto whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            {sellerBadgeLabel}
          </Link>
          <Link
            href="/nguoi-ban"
            className="whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Danh Sách Seller
          </Link>
        </nav>
      </div>

      {menuOpen && (
        <div className="border-b border-border-c bg-surface px-4 py-3 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-1 text-sm font-semibold text-foreground/80">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 hover:bg-surface-alt hover:text-brand-dark"
            >
              Trang chủ
            </Link>
            <MobileProductAccordion tree={categoryTree} onNavigate={() => setMenuOpen(false)} />
            <Link
              href={serviceHref}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 hover:bg-surface-alt hover:text-brand-dark"
            >
              Dịch vụ
            </Link>
            {mobileNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 hover:bg-surface-alt hover:text-brand-dark"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={sellerBadgeHref}
              onClick={() => setMenuOpen(false)}
              className="w-fit rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-3 py-1.5 font-bold text-white hover:brightness-110"
            >
              {sellerBadgeLabel}
            </Link>
            <Link
              href="/nguoi-ban"
              onClick={() => setMenuOpen(false)}
              className="w-fit rounded-full bg-[linear-gradient(135deg,#12c9a0_0%,#2bb0bf_45%,#4f6ef2_100%)] px-3 py-1.5 font-bold text-white hover:brightness-110"
            >
              Danh Sách Seller
            </Link>
            <div className="mt-2 flex gap-2 border-t border-border-c pt-3">
              {status === "authenticated" ? (
                <>
                  <Link
                    href="/nap-tien"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-full border-2 border-ink px-4 py-2 text-center text-sm font-bold text-foreground dark:border-border-c"
                  >
                    Ví: {formatVnd(session.user.walletBalance)}
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex-1 rounded-full bg-ink px-4 py-2 text-center text-sm font-bold text-white"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dang-nhap"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-full bg-ink px-4 py-2 text-center text-sm font-bold text-white"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/dang-nhap?tab=register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-full border-2 border-ink px-4 py-2 text-center text-sm font-bold text-foreground dark:border-border-c"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
