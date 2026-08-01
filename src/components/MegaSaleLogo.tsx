import Image from "next/image";

// Logo "BIG SALE" (public/big-sale-logo-300.png, nền trong suốt) đè góc
// trên-phải ảnh sản phẩm khi đang Mega Sale (product.megaSale?.active) —
// dùng chung ở mọi nơi hiện ảnh sản phẩm (ProductCard, CategoryProductCard,
// FeaturedCarousel, trang chi tiết) thay vì lặp lại <Image> ở từng nơi, cùng
// nguyên tắc với ProductThumbnail.tsx/SellerAvatar.tsx. `size` chỉnh theo
// kích thước khung ảnh tại từng nơi gọi (xem CLAUDE.md nếu cần đối chiếu).
export default function MegaSaleLogo({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/big-sale-logo-300.png"
      alt="Big Sale"
      width={size}
      height={size}
      className={`pointer-events-none select-none drop-shadow-lg motion-safe:animate-sale-pop ${className}`}
    />
  );
}
