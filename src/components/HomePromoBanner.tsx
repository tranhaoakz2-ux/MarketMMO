"use client";

import { ChevronLeft, ChevronRight, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HomeBannerSlide } from "@/lib/home-banners";

const ROTATE_INTERVAL_MS = 5000;
const DRAG_THRESHOLD_RATIO = 0.15;

// Banner trang chủ mới — 1 banner LỚN dạng slider (2/3 chiều ngang, đọc số
// lượng slide + nội dung từ HomeBanner slot="LARGE" qua Admin > Nội dung
// trang web) + 2 banner NHỎ cố định bên phải (1/3, slot="SMALL_1"/"SMALL_2").
// Slide/card nào CHƯA có ảnh riêng (imageUrl null — bảng mới ban đầu rỗng,
// hoặc admin chưa gán ảnh) tự hiện phong cách mặc định (nền màu + icon +
// chữ) thay vì vỡ layout. Thay hẳn PromoBanner.tsx cũ (chỉ có ảnh, không
// chữ/CTA, 2 khối bằng nhau 50/50).
export default function HomePromoBanner({
  large,
  small1,
  small2,
}: {
  large: HomeBannerSlide[];
  small1: HomeBannerSlide;
  small2: HomeBannerSlide;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <LargeBannerSlider slides={large} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:flex lg:h-full lg:flex-col">
        <SmallBannerCard slide={small1} variant="light" Icon={ShieldCheck} />
        <SmallBannerCard slide={small2} variant="dark" Icon={Zap} />
      </div>
    </div>
  );
}

function LargeSlideContent({ slide }: { slide: HomeBannerSlide }) {
  if (slide.imageUrl) {
    return (
      <Link href={slide.ctaHref || "/danh-muc"} className="relative block h-full w-full" draggable={false}>
        <Image
          src={slide.imageUrl}
          alt={slide.title}
          fill
          draggable={false}
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="pointer-events-none object-cover"
        />
      </Link>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-brand px-6 py-6 sm:px-10">
      {/* Khối tròn trang trí — vàng nhạt/trắng mờ, lệch góc phải + trái dưới,
          cắt bởi overflow-hidden của khung cha. */}
      <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-light/60" />
      <span className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-white/30" />
      <span className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-brand-light/50" />

      <div className="relative max-w-md">
        <h2 className="text-2xl font-black leading-tight tracking-tight text-ink sm:text-4xl">{slide.title}</h2>
        <p className="mt-2.5 text-sm font-semibold text-ink/80 sm:mt-3 sm:text-base">{slide.description}</p>
        {slide.ctaLabel && (
          <Link
            href={slide.ctaHref || "/danh-muc"}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-ink-soft sm:mt-6"
          >
            {slide.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function LargeBannerSlider({ slides }: { slides: HomeBannerSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
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
      className="group relative aspect-[16/9] touch-pan-y select-none overflow-hidden rounded-2xl sm:aspect-[21/9]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={() => {
        endDrag();
        pausedRef.current = false;
      }}
      onPointerCancel={endDrag}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        className="flex h-full cursor-grab active:cursor-grabbing"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(calc(-${index * (100 / count)}% + ${dragPx}px))`,
          transition: isDragging ? "none" : "transform 700ms ease",
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.id ?? `default-${i}`} className="h-full shrink-0" style={{ width: `${100 / count}%` }}>
            <LargeSlideContent slide={slide} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Slide trước"
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/50 group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Slide sau"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/50 group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur">
            {slides.map((slide, i) => (
              <button
                key={slide.id ?? `dot-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Xem slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SmallBannerCard({
  slide,
  variant,
  Icon,
}: {
  slide: HomeBannerSlide;
  variant: "light" | "dark";
  Icon: typeof ShieldCheck;
}) {
  const content = (
    <div className="flex h-full items-center gap-3 px-4 py-4 sm:px-5">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
          variant === "light" ? "bg-brand-light text-brand-dark" : "bg-brand/15 text-brand"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-black ${variant === "light" ? "text-ink" : "text-brand"}`}>
          {slide.title}
        </p>
        <p className={`mt-0.5 truncate text-xs font-medium ${variant === "light" ? "text-muted" : "text-white/60"}`}>
          {slide.description}
        </p>
      </div>
    </div>
  );

  const baseClass = `relative h-28 overflow-hidden rounded-2xl sm:h-36 lg:h-auto lg:flex-1 ${
    variant === "light" ? "border-2 border-brand bg-surface" : "bg-ink"
  }`;

  if (slide.imageUrl) {
    return (
      <div className={baseClass}>
        <Image src={slide.imageUrl} alt={slide.title} fill sizes="33vw" className="object-cover" />
        <div className={`absolute inset-0 ${variant === "light" ? "bg-white/70" : "bg-ink/70"}`} />
        <div className="relative h-full">{content}</div>
      </div>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
