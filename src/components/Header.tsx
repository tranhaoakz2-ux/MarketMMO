"use client";

import { LogOut, Menu, Search, ShoppingBag, TrendingUp, User, Wallet, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import HeaderChatButton from "@/components/HeaderChatButton";
import NavMegaMenu, { type MegaMenuItem } from "@/components/NavMegaMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { categories } from "@/data/categories";
import { useCart } from "@/context/CartContext";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/categoryIcons";
import { formatVnd } from "@/lib/format";

const simpleNavLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Đơn Hàng", href: "/don-hang" },
  { label: "Lấy 2FA", href: "/lay-2fa" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Diễn đàn", href: "/dien-dan" },
];

const productMenuItems: MegaMenuItem[] = categories.map((c) => {
  const Icon = getCategoryIcon(c.slug);
  return {
    label: c.name,
    href: `/danh-muc/${c.slug}`,
    icon: <Icon className={`h-5 w-5 ${getCategoryIconColor(c.slug)}`} strokeWidth={2.5} />,
  };
});

const BoostingIcon = getCategoryIcon("boosting");
const ChatGptIcon = getCategoryIcon("chatgpt");
const YoutubeIcon = getCategoryIcon("youtube");

const serviceMenuItems: MegaMenuItem[] = [
  {
    label: "Boosting / Cày thuê",
    href: "/danh-muc/boosting",
    icon: (
      <BoostingIcon
        className={`h-5 w-5 ${getCategoryIconColor("boosting")}`}
        strokeWidth={2.5}
      />
    ),
  },
  {
    label: "Tăng tương tác MXH",
    href: "/danh-muc/boosting",
    icon: <TrendingUp className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />,
  },
  {
    label: "Nâng cấp ChatGPT",
    href: "/danh-muc/chatgpt",
    icon: (
      <ChatGptIcon
        className={`h-5 w-5 ${getCategoryIconColor("chatgpt")}`}
        strokeWidth={2.5}
      />
    ),
  },
  {
    label: "Nâng cấp YouTube Premium",
    href: "/danh-muc/youtube",
    icon: (
      <YoutubeIcon
        className={`h-5 w-5 ${getCategoryIconColor("youtube")}`}
        strokeWidth={2.5}
      />
    ),
  },
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

const mobileNavLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/danh-muc/gmail" },
  { label: "Dịch vụ", href: "/danh-muc/boosting" },
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
  const { totalCount } = useCart();
  const { data: session, status } = useSession();
  const router = useRouter();

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
    <header className="sticky top-0 z-50">
      <div className="hidden overflow-hidden bg-ink py-[3px] text-sm font-normal text-white/70 sm:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          🔔 MARKETMMO — Mua bán sản phẩm số phục vụ kiếm tiền online. Mọi
          giao dịch trên sàn đều hoàn toàn tự động và được ký quỹ an toàn.
        </div>
      </div>

      <div className="bg-brand shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:h-[73px] sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
          <button
            className="rounded-lg p-2 hover:bg-black/10 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[54px] items-center sm:h-[60px]">
              <Image
                src="/logo-mark.png"
                alt="MarketMMO"
                width={75}
                height={60}
                className="h-full w-auto object-contain"
                priority
              />
            </span>
            <span className="text-[26px] font-black tracking-tight text-ink sm:text-[30px]">
              MARKET<span className="text-white">MMO</span>
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
                className="hidden h-full shrink-0 items-center bg-ink px-4 text-white transition hover:bg-ink-soft sm:flex"
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
              className="relative flex items-center justify-center rounded-full border-2 border-ink bg-white px-4 py-2 transition hover:bg-surface-alt dark:bg-ink"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="h-5 w-5 text-foreground" />
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
                  className="flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-foreground transition hover:bg-surface-alt dark:bg-ink"
                >
                  <Wallet className="h-4 w-4 text-foreground" />
                  {formatVnd(session.user.walletBalance)}
                </Link>
                <AccountMenu
                  name={session.user.name ?? session.user.email ?? ""}
                  role={session.user.role}
                />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full p-2.5 text-ink hover:bg-black/10"
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
            <button type="submit" className="mr-3.5 shrink-0 text-foreground/40" aria-label="Tìm kiếm">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="hidden border-b border-border-c bg-surface lg:block">
        <nav className="mx-auto flex h-[50px] max-w-7xl items-center gap-6 px-4 text-base font-semibold text-foreground/80 sm:px-6 lg:px-8">
          <Link href="/" className="whitespace-nowrap transition hover:text-brand-dark">
            Trang chủ
          </Link>
          <NavMegaMenu
            label="Sản phẩm"
            href="/danh-muc/gmail"
            items={productMenuItems}
            columns={2}
          />
          <NavMegaMenu
            label="Dịch vụ"
            href="/danh-muc/boosting"
            items={serviceMenuItems}
          />
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
            className="ml-auto whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-ink transition hover:bg-brand-dark"
          >
            {sellerBadgeLabel}
          </Link>
          <Link
            href="/nguoi-ban"
            className="whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-ink transition hover:bg-brand-dark"
          >
            Danh Sách Seller
          </Link>
        </nav>
      </div>

      {menuOpen && (
        <div className="border-b border-border-c bg-surface px-4 py-3 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-1 text-sm font-semibold text-foreground/80">
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
              className="w-fit rounded-full bg-brand px-3 py-1.5 font-bold text-ink hover:bg-brand-dark"
            >
              {sellerBadgeLabel}
            </Link>
            <Link
              href="/nguoi-ban"
              onClick={() => setMenuOpen(false)}
              className="w-fit rounded-full bg-brand px-3 py-1.5 font-bold text-ink hover:bg-brand-dark"
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
