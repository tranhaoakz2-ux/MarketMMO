-- Banner trang chủ động (Admin > Nội dung trang web) — thay hệ thống 4 ô ảnh
-- cố định cũ (SiteConfig banner_left_1/2/right_1/2). Cho phép admin thêm/
-- xoá/sắp xếp số lượng slide banner lớn tự do, và tự sửa ảnh/tiêu đề/mô tả/
-- nút CTA cho từng slide + 2 banner nhỏ cố định. slot: "LARGE" (nhiều dòng)
-- | "SMALL_1" | "SMALL_2" (đúng 1 dòng mỗi loại).
--
-- Bảng SiteConfig cũ GIỮ NGUYÊN, không xoá dữ liệu banner_left_1/2/right_1/2
-- cũ nếu có — chỉ không còn được đọc nữa.
--
-- Đã chạy trên Neon production (2026-08-03) — file này ghi lại để đối chiếu.
-- Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS "HomeBanner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slot" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "title" TEXT,
  "description" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HomeBanner_slot_idx" ON "HomeBanner"("slot");
