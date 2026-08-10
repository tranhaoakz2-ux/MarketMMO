import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import { getAllCategories } from "@/lib/queries";

const staticGroups = [
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

// Danh mục lấy từ DB thật (getAllCategories() — cùng hàm trang chủ/mega-menu
// dùng) thay vì import tĩnh src/data/categories.ts — trước đây sitemap chỉ
// hiện đúng 10 category seed gốc, không đồng bộ với category do seller tự đề
// xuất đã được duyệt hay category mới thêm sau này (vd "TUT-Trick", "Tool /
// AI Agent").
export default async function SitemapPage() {
  const categories = await getAllCategories();
  const groups = [
    staticGroups[0],
    {
      title: "Danh mục sản phẩm",
      links: categories.map((c) => ({
        label: c.name,
        href: `/danh-muc/${c.slug}`,
      })),
    },
    staticGroups[1],
  ];

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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sitemap — MarketMMO",
};
