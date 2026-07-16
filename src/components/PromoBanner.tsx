"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ROTATE_INTERVAL_MS = 5000;
// Kéo qua hơn 15% bề rộng khung mới coi là "vuốt" đủ để chuyển ảnh, kéo ít
// hơn thì bật lại đúng ảnh cũ (giống hành vi carousel tiêu chuẩn).
const DRAG_THRESHOLD_RATIO = 0.15;

type BannerImage = { src: string; alt: string; position: string };

// Ảnh nguồn (996-1011px rộng) không cùng tỉ lệ khung với khung banner hiện
// tại (872-877 : 334, rất dẹt ngang do bước thu chiều cao 50% trước đó) —
// object-cover mặc định crop giữa sẽ cắt mất chữ/logo bên trái ở 2 ảnh hàng
// dưới (tỉ lệ ảnh gốc ~3.1:1, rộng hơn khung nên bị crop 2 bên trái-phải) và
// cắt mất đáy nút CTA ở 2 ảnh hàng trên (tỉ lệ ảnh gốc ~2.25-2.29:1, hẹp hơn
// khung nên bị crop trên-dưới). Chỉ định `object-top`/`object-left` theo
// từng ảnh để giữ đúng phần nội dung quan trọng (logo/tiêu đề luôn nằm bên
// trái hoặc phía trên trong mọi ảnh nguồn) thay vì để crop-giữa mặc định.
const leftImages: BannerImage[] = [
  {
    src: "/banner-home-left-1.jpg",
    alt: "MarketMMO — Sàn giao dịch MMO #1 Việt Nam, mua bán tài khoản & vật phẩm MMO uy tín, tự động 24/7",
    position: "object-top",
  },
  {
    src: "/banner-home-left-2.jpg",
    alt: "MarketMMO — Flash Sale giá sốc mỗi ngày, săn deal cực hời",
    position: "object-left",
  },
];

const rightImages: BannerImage[] = [
  {
    src: "/banner-home-right-1.jpg",
    alt: "MarketMMO — Tất cả sản phẩm kinh nghiệm MMO, uy tín an toàn nhanh chóng",
    position: "object-top",
  },
  {
    src: "/banner-home-right-2.jpg",
    alt: "MarketMMO — Giao dịch an toàn, bảo vệ tuyệt đối với hệ thống ký quỹ thông minh",
    position: "object-left",
  },
];

// Carousel trượt ngang bằng track flex dịch chuyển translateX (không phải
// crossfade opacity như trước) — tự động trượt sang trái mỗi
// ROTATE_INTERVAL_MS, đồng thời hỗ trợ kéo chuột/vuốt tay (Pointer Events,
// dùng chung 1 API cho cả mouse lẫn touch) để chủ động chuyển ảnh.
function BannerSlot({
  images,
  aspectClassName,
  priority,
}: {
  images: BannerImage[];
  aspectClassName: string;
  priority?: boolean;
}) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  // Dùng ref (không phải state) để tạm dừng auto-rotate trong lúc kéo mà
  // không phải huỷ/tạo lại interval — interval vẫn chạy nền, chỉ bỏ qua
  // lượt tick nào rơi đúng lúc đang kéo.
  const pausedRef = useRef(false);

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count]);

  const goTo = (next: number) => setIndex(((next % count) + count) % count);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2) return;
    setIsDragging(true);
    pausedRef.current = true;
    dragStartXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPx(e.clientX - dragStartXRef.current);
  };

  const endDrag = () => {
    if (!isDragging) return;
    const width = containerRef.current?.offsetWidth || 1;
    const ratio = dragPx / width;
    if (Math.abs(ratio) > DRAG_THRESHOLD_RATIO) {
      goTo(index + (ratio < 0 ? 1 : -1));
    }
    setDragPx(0);
    setIsDragging(false);
    pausedRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative touch-pan-y select-none overflow-hidden rounded-2xl ${aspectClassName}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="flex h-full cursor-grab active:cursor-grabbing"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(calc(-${index * (100 / count)}% + ${dragPx}px))`,
          transition: isDragging ? "none" : "transform 700ms ease",
        }}
      >
        {images.map((img, i) => (
          <div key={img.src} className="relative h-full shrink-0" style={{ width: `${100 / count}%` }}>
            <Image
              src={img.src}
              alt={img.alt}
              fill
              draggable={false}
              sizes="(min-width: 640px) 50vw, 100vw"
              className={`object-cover ${img.position} pointer-events-none`}
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PromoBanner() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <BannerSlot images={leftImages} aspectClassName="aspect-[872/334]" priority />
      <BannerSlot images={rightImages} aspectClassName="aspect-[877/334]" />
    </div>
  );
}
