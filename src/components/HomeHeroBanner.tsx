"use client";

import Link from "next/link";
import { ArrowRight, Headphones, Mail, Music2, ShieldCheck, Zap } from "lucide-react";

/**
 * HomeHeroBanner — banner hero trang chủ MaketMMO
 * - Viền gradient chạy quanh
 * - Badge "SÀN MMO UY TÍN" nền vàng glow
 * - Nút CTA lớn 3 lớp: nút cam + nền cam sẫm + 2 viền nét đứt chạy ngược chiều
 * - 3 thẻ xoay vòng bên phải (hiện là trang trí, sau gắn sản phẩm thật)
 * - Responsive: desktop 2 cột, mobile xếp dọc (thẻ xuống dưới)
 *
 * Kích thước khớp trang chủ: nằm trong container max-w-7xl (đã override 1472px).
 * Đặt component này thay cho <HomePromoBanner .../> trong page.tsx.
 *
 * Icon: đổi từ @tabler/icons-react (bản gốc) sang lucide-react — thư viện
 * icon DUY NHẤT dự án dùng (xem CLAUDE.md). IconBrandTiktok không có icon
 * thương hiệu tương đương trong lucide-react nên dùng Music2 làm icon thay
 * thế, đúng cách Footer.tsx đang xử lý nút TikTok.
 */
export default function HomeHeroBanner() {
  return (
    <div className="mmo-hero-border">
      <div className="mmo-hero-inner">
        {/* sao nền */}
        <span className="mmo-star" style={{ top: "14%", left: "36%" }} />
        <span className="mmo-star" style={{ top: "28%", left: "60%", animationDelay: "1s" }} />
        <span className="mmo-star" style={{ top: "62%", left: "22%", animationDelay: "1.6s" }} />
        <span className="mmo-star" style={{ bottom: "12%", left: "48%", animationDelay: ".6s" }} />

        <div className="flex flex-col gap-9 lg:flex-row lg:items-center">
          {/* CỘT TRÁI — nội dung */}
          <div className="flex-1 lg:min-w-[300px]">
            <span className="mmo-badge-top">
              <Zap size={15} strokeWidth={2} />
              SÀN MMO UY TÍN
            </span>

            {/* h2 (không phải h1) — page.tsx đã có sẵn 1 h1 sr-only riêng cho
                SEO ngay phía trên container này, tránh trùng 2 h1/trang. */}
            <h2 className="mmo-title">
              Chợ tài khoản &amp; dịch vụ số dành cho dân MMO
            </h2>

            <p className="mmo-desc">
              Mua bán tài khoản, phần mềm, dịch vụ số — giao dịch tự động, ký quỹ an
              toàn, giá tốt như mua sỉ. Hàng nghìn sản phẩm cập nhật liên tục, kiểm tra
              kho thật trước khi thanh toán.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <span className="mmo-chip">
                <Zap size={14} /> Giao tự động
              </span>
              <span className="mmo-chip">
                <ShieldCheck size={14} /> Ký quỹ an toàn
              </span>
              <span className="mmo-chip">
                <Headphones size={14} /> Hỗ trợ 24/7
              </span>
            </div>

            {/* NÚT CTA — style neon + khói teal 3D (.cta-neon, xem globals.css) */}
            <Link href="#danh-sach-san-pham" className="cta-neon">
              <span className="sm a s1" aria-hidden="true" />
              <span className="sm b s2" aria-hidden="true" />
              <span className="sm c s3" aria-hidden="true" />
              <span className="sm b s4" aria-hidden="true" />
              <span className="sm a s5" aria-hidden="true" />
              <span className="sm c s6" aria-hidden="true" />
              <span className="sm b s7" aria-hidden="true" />
              <span className="sm a s8" aria-hidden="true" />
              <span className="sm c s9" aria-hidden="true" />
              <span className="cta-lbl">Xem tất cả sản phẩm &amp; giá</span>
              <span className="cta-ar">
                <ArrowRight size={22} strokeWidth={2} />
              </span>
            </Link>
          </div>

          {/* CỘT PHẢI — 3 thẻ (trang trí, sau gắn sản phẩm thật) */}
          <div className="w-full lg:w-[400px] lg:flex-none">
            <div className="mmo-cards-outer">
              <div className="mmo-cards-glow" />
              <div className="mmo-cards-frame">
                <div className="mmo-cards-label">SẢN PHẨM ĐANG BÁN</div>

                <div className="mmo-card" style={{ animationDelay: "-4s" }}>
                  <div className="mmo-card-icon" style={{ background: "linear-gradient(135deg,#2f80ed,#4aa3ff)" }}>
                    <Mail size={23} />
                  </div>
                  <div className="mmo-card-name">Gmail Pro</div>
                </div>

                <div className="mmo-card mmo-card--purple" style={{ animationDelay: "-2s" }}>
                  <div className="mmo-card-icon" style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)" }}>
                    <Music2 size={23} />
                  </div>
                  <div className="mmo-card-name">TikTok US</div>
                </div>

                <div className="mmo-card mmo-card--pink" style={{ animationDelay: "0s" }}>
                  <div className="mmo-card-icon" style={{ background: "linear-gradient(135deg,#f59e0b,#ff7a00)" }}>
                    <Zap size={25} />
                  </div>
                  <div className="mmo-card-name">Sản phẩm mới</div>
                  <div className="mmo-card-sub">Đang cập nhật</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
