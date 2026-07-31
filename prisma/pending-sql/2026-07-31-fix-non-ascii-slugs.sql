-- Sửa bug: danh mục/sản phẩm có TÊN tiếng Việt có dấu sinh ra SLUG giữ
-- NGUYÊN dấu (vd "Học Tập" -> slug "học-tập") thay vì bỏ dấu. Next.js dynamic
-- route param [slug] KHÔNG tự decode percent-encoding (đã xác nhận qua debug
-- log trực tiếp: param nhận được ở server vẫn là chuỗi
-- "h%E1%BB%8Dc-t%E1%BA%ADp" thay vì "học-tập"), nên slug có dấu KHÔNG BAO
-- GIỜ khớp được URL -> 404 vĩnh viễn, không liên quan gì tới cache hay build.
--
-- Đã sửa hàm sinh slug (src/lib/slug.ts, slugifyCategory()/slugifyProduct())
-- để LUÔN bỏ dấu tiếng Việt từ nay — file SQL này CHỈ sửa DATA đã lỡ tạo
-- trước khi có fix code. Danh mục cũ (crypto, game, vpn...) không lỗi vì tên
-- gốc vốn không dấu nên chưa bao giờ gặp trường hợp này.
--
-- ============================================================
-- QUY TRÌNH BẮT BUỘC — ĐỌC KỸ TRƯỚC KHI CHẠY, LÀM ĐÚNG THỨ TỰ:
-- ============================================================
--   BƯỚC 1 (an toàn tuyệt đối, CHỈ SELECT — không đổi gì): chạy 2 câu SELECT
--   preview bên dưới (mục A và B). Cột "new_slug" là giá trị SẼ ĐƯỢC GHI ở
--   Bước 2 (đã tính sẵn hậu tố chống trùng nếu cần — xem 2 cột giải thích lý
--   do: "batch_duplicate" = 2 dòng trong CÙNG lần chạy này ra trùng slug sau
--   khi bỏ dấu (vd 2 sản phẩm cùng tên), "collides_existing" = trùng với 1
--   slug đã có sẵn từ trước trong bảng.
--     - Nếu KHÔNG có dòng nào (0 rows): danh mục/sản phẩm đó chưa từng bị
--       lỗi, không cần làm gì thêm.
--     - Xem kỹ từng dòng có "new_slug" — nếu thấy hậu tố lạ (vd
--       "-a1b2c3") mà bạn muốn 1 slug đẹp hơn, ĐỔI TAY sau khi chạy xong
--       Bước 2 bằng UPDATE riêng, hoặc báo lại để tôi (Claude) đặt tên khác.
--   BƯỚC 2 (ĐỔI DATA): chỉ chạy UPDATE (mục C và D) SAU KHI đã xem kỹ kết
--   quả Bước 1. UPDATE dùng lại ĐÚNG công thức đã preview (không đổi gì
--   giữa 2 bước) nên an toàn chạy ngay sau khi duyệt xong Bước 1.
--
-- Idempotent — chạy lại toàn bộ file này an toàn (mọi điều kiện WHERE đều tự
-- loại các dòng đã sạch, kể cả sau khi UPDATE lần đầu thành công).
--
-- LƯU Ý: đổi slug sẽ đổi URL của các danh mục/sản phẩm này. Chấp nhận được
-- vì đây đều là mục vừa tạo bị 404 ngay từ đầu (chưa ai bấm vào được, không
-- có link cũ nào đang lưu hành).
--
-- ĐÃ PHÁT HIỆN KHI SOẠN FILE NÀY (xem preview thật chạy trên DB dev local):
-- 2 sản phẩm tên "Dịch vụ tăng follow Facebook thật (test)" (2 bản ghi khác
-- id, slug cũ có hậu tố "-ms2z7b1m" — dấu hiệu đã từng bị trùng slug và tự
-- thêm hậu tố 1 lần trước đó) trông giống dữ liệu TEST còn sót lại từ phiên
-- làm việc trước (tên có "(test)"), không phải sản phẩm thật. Cân nhắc XOÁ
-- 2 dòng này thay vì đổi slug, nếu đúng là rác test — SQL bên dưới vẫn xử
-- lý an toàn cho trường hợp giữ lại (tự thêm hậu tố phân biệt).

-- ============================================================
-- A) PREVIEW — Category (CHỈ SELECT, không đổi gì)
-- ============================================================
WITH base AS (
  SELECT
    id,
    slug AS old_slug,
    name,
    NULLIF(
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              name,
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ' ||
              'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd' ||
              'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ) AS new_slug_base
  FROM "Category"
  WHERE slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
),
mapping AS (
  SELECT
    b.*,
    count(*) OVER (PARTITION BY new_slug_base) > 1 AS batch_duplicate,
    EXISTS(SELECT 1 FROM "Category" c WHERE c.slug = b.new_slug_base AND c.id <> b.id) AS collides_existing
  FROM base b
)
SELECT
  id, old_slug, name,
  CASE WHEN batch_duplicate OR collides_existing
       THEN new_slug_base || '-' || right(id, 6)
       ELSE new_slug_base
  END AS new_slug,
  batch_duplicate, collides_existing
FROM mapping
ORDER BY name;

-- ============================================================
-- B) PREVIEW — Product (CHỈ SELECT, không đổi gì)
-- ============================================================
WITH base AS (
  SELECT
    id,
    slug AS old_slug,
    name,
    NULLIF(
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              name,
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ' ||
              'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd' ||
              'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ) AS new_slug_base
  FROM "Product"
  WHERE slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
),
mapping AS (
  SELECT
    b.*,
    count(*) OVER (PARTITION BY new_slug_base) > 1 AS batch_duplicate,
    EXISTS(SELECT 1 FROM "Product" p WHERE p.slug = b.new_slug_base AND p.id <> b.id) AS collides_existing
  FROM base b
)
SELECT
  id, old_slug, name,
  CASE WHEN batch_duplicate OR collides_existing
       THEN new_slug_base || '-' || right(id, 6)
       ELSE new_slug_base
  END AS new_slug,
  batch_duplicate, collides_existing
FROM mapping
ORDER BY name;

-- ============================================================
-- C) UPDATE — Category (chỉ chạy sau khi duyệt kết quả mục A)
-- ============================================================
WITH base AS (
  SELECT
    id,
    NULLIF(
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              name,
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ' ||
              'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd' ||
              'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ) AS new_slug_base
  FROM "Category"
  WHERE slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
),
mapping AS (
  SELECT
    b.id,
    CASE
      WHEN count(*) OVER (PARTITION BY new_slug_base) > 1
        OR EXISTS(SELECT 1 FROM "Category" c WHERE c.slug = b.new_slug_base AND c.id <> b.id)
      THEN b.new_slug_base || '-' || right(b.id, 6)
      ELSE b.new_slug_base
    END AS final_slug
  FROM base b
)
UPDATE "Category" c
SET slug = m.final_slug
FROM mapping m
WHERE c.id = m.id;

-- ============================================================
-- D) UPDATE — Product (chỉ chạy sau khi duyệt kết quả mục B)
-- ============================================================
WITH base AS (
  SELECT
    id,
    NULLIF(
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              name,
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ' ||
              'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd' ||
              'AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      ''
    ) AS new_slug_base
  FROM "Product"
  WHERE slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
),
mapping AS (
  SELECT
    b.id,
    CASE
      WHEN count(*) OVER (PARTITION BY new_slug_base) > 1
        OR EXISTS(SELECT 1 FROM "Product" p WHERE p.slug = b.new_slug_base AND p.id <> b.id)
      THEN b.new_slug_base || '-' || right(b.id, 6)
      ELSE b.new_slug_base
    END AS final_slug
  FROM base b
)
UPDATE "Product" p
SET slug = m.final_slug
FROM mapping m
WHERE p.id = m.id;
