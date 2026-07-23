-- SECURITY_AUDIT #9 — chặn xoá Product làm mất kho/lịch sử giao hàng.
-- Đổi FK ProductStockItem.productId từ ON DELETE CASCADE -> ON DELETE RESTRICT.
--
-- Dự án dùng `prisma db push` (không có thư mục migrations). File này là bản
-- xem trước DDL mà `db push` sẽ chạy (sinh bằng `prisma migrate diff` từ DB
-- thật -> schema đã sửa). CHƯA áp dụng — chờ duyệt rồi mới `npm run db:push`.
--
-- An toàn dữ liệu: chỉ thay đổi hành vi FK, KHÔNG xoá/sửa dòng dữ liệu nào.

-- DropForeignKey
ALTER TABLE "ProductStockItem" DROP CONSTRAINT "ProductStockItem_productId_fkey";

-- AddForeignKey
ALTER TABLE "ProductStockItem" ADD CONSTRAINT "ProductStockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
