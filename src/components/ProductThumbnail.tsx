import { createElement } from "react";
import Image from "next/image";
import { getCategoryIcon } from "@/lib/categoryIcons";

/**
 * Ảnh sản phẩm dùng chung cho mọi nơi hiển thị (thẻ sản phẩm, carousel, trang
 * chi tiết) — hiện ảnh thật do seller upload (`imageUrl`) nếu có, fallback về
 * icon theo category như trước nếu chưa có ảnh (sản phẩm seed cũ, hoặc seller
 * chưa upload). `boxClassName` truyền nguyên class kích thước/bo góc/nền của
 * khung bọc ngoài tại từng nơi gọi — component tự thêm `relative
 * overflow-hidden` để `<Image fill>` định vị đúng.
 */
export default function ProductThumbnail({
  imageUrl,
  categorySlug,
  boxClassName,
  iconClassName,
  sizes = "200px",
  // true = bỏ lazy-load (loading="eager") — CHỈ dùng cho carousel "Sản phẩm
  // nổi bật" (FeaturedCarousel.tsx): toàn bộ slide (kể cả phần nhân đôi cho
  // animation liền mạch) nằm sẵn trong DOM ngay từ đầu, phần lớn ngoài khung
  // nhìn ban đầu — nếu để lazy mặc định, ảnh chỉ bắt đầu tải đúng lúc dải
  // marquee cuộn animation CSS tới, animation không đợi tải xong nên ảnh hiện
  // dở dang/mờ trong khoảnh khắc đó (race, ngẫu nhiên theo tốc độ mạng mỗi
  // lần tải trang). Mặc định false — MỌI nơi khác (card danh sách/danh mục/
  // giỏ hàng/đơn hàng/trang chi tiết) giữ nguyên lazy như cũ, không đổi gì.
  eager = false,
}: {
  imageUrl?: string | null;
  categorySlug: string;
  boxClassName: string;
  iconClassName: string;
  sizes?: string;
  eager?: boolean;
}) {
  if (imageUrl) {
    return (
      <span className={`relative block overflow-hidden ${boxClassName}`}>
        <Image
          src={imageUrl}
          alt=""
          fill
          quality={90}
          className="object-cover"
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
        />
      </span>
    );
  }

  return (
    <span className={`grid place-items-center ${boxClassName}`}>
      {createElement(getCategoryIcon(categorySlug), { className: iconClassName, strokeWidth: 1.5 })}
    </span>
  );
}
