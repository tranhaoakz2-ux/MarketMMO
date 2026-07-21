import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import { categories } from "@/data/categories";

const groups = [
  {
    title: "Trang chính",
    links: [
      { label: "Trang chủ", href: "/" },
      { label: "Giỏ hàng", href: "/gio-hang" },
      { label: "Ví / Nạp tiền", href: "/nap-tien" },
      { label: "Lịch sử đơn hàng", href: "/don-hang" },
      { label: "Đăng nhập / Đăng ký", href: "/dang-nhap" },
      { label: "Diễn đàn", href: "/dien-dan" },
      { label: "Lấy 2FA", href: "/lay-2fa" },
      { label: "Đăng ký bán hàng", href: "/tro-thanh-nguoi-ban" },
      { label: "Người bán", href: "/nguoi-ban" },
    ],
  },
  {
    title: "Danh mục sản phẩm",
    links: categories.map((c) => ({
      label: c.name,
      href: `/danh-muc/${c.slug}`,
    })),
  },
  {
    title: "Hỗ trợ & pháp lý",
    links: [
      { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
      { label: "Tài liệu tích hợp API", href: "/tai-lieu-api" },
      { label: "Điều khoản dịch vụ", href: "/dieu-khoan-dich-vu" },
      { label: "Điều khoản bán hàng", href: "/dieu-khoan-ban-hang" },
      { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <LegalPageLayout title="Sitemap">
      <div className="grid gap-6 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="mb-2 text-sm font-bold text-foreground">{group.title}</h2>
            <ul className="flex flex-col gap-1.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/70 hover:text-brand-dark hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </LegalPageLayout>
  );
}

export const metadata = {
  title: "Sitemap — MarketMMO",
};
