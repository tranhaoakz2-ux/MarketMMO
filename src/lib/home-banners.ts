import { prisma } from "@/lib/prisma";

export type HomeBannerSlide = {
  id: string | null;
  imageUrl: string | null;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

// Chữ mặc định khi CHƯA có dòng nào trong DB (bảng mới, ban đầu rỗng) hoặc
// admin chưa nhập riêng field đó — khớp đúng phong cách "code mặc định" đã
// duyệt: banner lớn nền vàng + khối tròn trang trí, 2 banner nhỏ nền
// trắng-viền-vàng / đen-chữ-vàng. Xem HomePromoBanner.tsx.
export const DEFAULT_LARGE_SLIDE: HomeBannerSlide = {
  id: null,
  imageUrl: null,
  title: "FLASH SALE GIÁ SỐC",
  description: "Săn tài khoản & vật phẩm MMO giá tốt mỗi ngày, giao hàng tự động ngay sau thanh toán.",
  ctaLabel: "Mua ngay",
  ctaHref: "/danh-muc",
};

export const DEFAULT_SMALL_1: HomeBannerSlide = {
  id: null,
  imageUrl: null,
  title: "Giao dịch an toàn",
  description: "Ký quỹ bảo vệ người mua & người bán",
  ctaLabel: "",
  ctaHref: "",
};

export const DEFAULT_SMALL_2: HomeBannerSlide = {
  id: null,
  imageUrl: null,
  title: "Giao hàng tự động",
  description: "Nhận hàng ngay sau khi thanh toán",
  ctaLabel: "",
  ctaHref: "",
};

type HomeBannerRow = {
  id: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

function toSlide(row: HomeBannerRow, fallback: HomeBannerSlide): HomeBannerSlide {
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    title: row.title?.trim() || fallback.title,
    description: row.description?.trim() || fallback.description,
    ctaLabel: row.ctaLabel?.trim() || fallback.ctaLabel,
    ctaHref: row.ctaHref?.trim() || fallback.ctaHref,
  };
}

/** Dùng cho trang chủ (Server Component) — đã resolve DB/mặc định, sẵn sàng render. */
export async function getHomeBanners(): Promise<{
  large: HomeBannerSlide[];
  small1: HomeBannerSlide;
  small2: HomeBannerSlide;
}> {
  const rows = await prisma.homeBanner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const largeRows = rows.filter((r) => r.slot === "LARGE");
  const small1Row = rows.find((r) => r.slot === "SMALL_1") ?? null;
  const small2Row = rows.find((r) => r.slot === "SMALL_2") ?? null;

  return {
    large: largeRows.length > 0 ? largeRows.map((r) => toSlide(r, DEFAULT_LARGE_SLIDE)) : [DEFAULT_LARGE_SLIDE],
    small1: small1Row ? toSlide(small1Row, DEFAULT_SMALL_1) : DEFAULT_SMALL_1,
    small2: small2Row ? toSlide(small2Row, DEFAULT_SMALL_2) : DEFAULT_SMALL_2,
  };
}
