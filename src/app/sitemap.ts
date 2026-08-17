import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import {
  getAllProductSlugsForSitemap,
  getAllSellersWithStats,
  getCategoryTree,
  type CategoryTreeNode,
} from "@/lib/queries";
import { getForumPosts } from "@/lib/forum";

// Sitemap XML thật cho Googlebot (khác /sitemap-trang-web — trang HTML cho
// người dùng đọc). Luôn dùng domain CHUẨN (SITE_URL), không phụ thuộc host
// của request — kể cả khi bị truy cập qua market-mmo.vercel.app, URL trong
// sitemap vẫn trỏ về marketmmo.vn (khớp canonical ở generateMetadata từng
// trang). CHỈ liệt kê trang công khai — không đưa /gio-hang, /don-hang,
// /tin-nhan, /trang-ban-hang/**, /admin/** ... vào đây.
const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/dien-dan", priority: 0.6, changeFrequency: "daily" },
  { path: "/nguoi-ban", priority: 0.6, changeFrequency: "daily" },
  { path: "/dau-gia", priority: 0.5, changeFrequency: "daily" },
  { path: "/tro-thanh-nguoi-ban", priority: 0.5, changeFrequency: "monthly" },
  { path: "/lay-2fa", priority: 0.3, changeFrequency: "monthly" },
  { path: "/cau-hoi-thuong-gap", priority: 0.3, changeFrequency: "monthly" },
  { path: "/dieu-khoan-dich-vu", priority: 0.2, changeFrequency: "yearly" },
  { path: "/dieu-khoan-ban-hang", priority: 0.2, changeFrequency: "yearly" },
  { path: "/chinh-sach-bao-mat", priority: 0.2, changeFrequency: "yearly" },
  { path: "/tai-lieu-api", priority: 0.2, changeFrequency: "monthly" },
];

// getCategoryTree() chỉ trả về gốc (roots) kèm children lồng nhau — flatten
// cả cha lẫn con vì cả 2 đều là URL /danh-muc/[slug] hợp lệ.
function flattenCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children.length > 0) out.push(...flattenCategories(node.children));
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categoryTree, sellers, forumPosts] = await Promise.all([
    getAllProductSlugsForSitemap(),
    getCategoryTree(),
    getAllSellersWithStats(),
    getForumPosts(),
  ]);

  const categories = flattenCategories(categoryTree);

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      priority: p.priority,
      changeFrequency: p.changeFrequency,
    })),
    ...categories.map((c) => ({
      url: `${SITE_URL}/danh-muc/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/san-pham/${p.slug}`,
      ...(p.createdAt ? { lastModified: new Date(p.createdAt) } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...sellers.map((s) => ({
      url: `${SITE_URL}/shop/${s.slug}`,
      lastModified: s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...forumPosts.map((post) => ({
      url: `${SITE_URL}/dien-dan/${post.id}`,
      lastModified: post.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  return entries;
}
