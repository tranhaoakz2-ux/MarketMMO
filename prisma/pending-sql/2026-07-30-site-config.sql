-- Nội dung động quản lý qua Admin thay vì hardcode trong code — bảng
-- key-value đơn giản, CÙNG SHAPE với PaymentConfig nhưng tách bảng riêng vì
-- khác domain (nội dung/marketing, không phải cấu hình thanh toán).
-- 13 key cố định: insurance_fund_target, header_ticker_text,
-- footer_facebook_url, footer_youtube_url, footer_tiktok_url,
-- footer_zalo_url, footer_messenger_url, footer_phone, search_tags (JSON
-- mảng chuỗi), banner_left_1, banner_left_2, banner_right_1, banner_right_2
-- (URL ảnh banner). THIẾU dòng hoặc value rỗng = tự dùng giá trị mặc định
-- hiện có trong code (hằng số/text/ảnh tĩnh cũ) làm fallback — không phá vỡ
-- giao diện hiện tại, chỉ khi admin chủ động lưu qua /admin/noi-dung mới
-- ghi đè. Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS "SiteConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);
