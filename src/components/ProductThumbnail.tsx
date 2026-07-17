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
}: {
  imageUrl?: string | null;
  categorySlug: string;
  boxClassName: string;
  iconClassName: string;
  sizes?: string;
}) {
  if (imageUrl) {
    return (
      <span className={`relative block overflow-hidden ${boxClassName}`}>
        <Image src={imageUrl} alt="" fill className="object-cover" sizes={sizes} />
      </span>
    );
  }

  const CategoryIcon = getCategoryIcon(categorySlug);
  return (
    <span className={`grid place-items-center ${boxClassName}`}>
      <CategoryIcon className={iconClassName} strokeWidth={1.5} />
    </span>
  );
}
