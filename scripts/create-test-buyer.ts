// Script CHẠY 1 LẦN (không phải tính năng production) — tạo 1 tài khoản
// BUYER test với ví sẵn 1.000.000đ để bạn tự test luồng mua hàng trước khi
// mở sàn. KHÔNG thêm bất kỳ UI/route admin nào cho việc cộng tiền — đây chỉ
// là script chạy tay qua `npx tsx scripts/create-test-buyer.ts`, xoá đi sau
// khi dùng xong nếu muốn (không bắt buộc, để lại cũng không ảnh hưởng gì vì
// chạy lại là no-op — xem phần IDEMPOTENT bên dưới).
//
// ĐÃ RÀ SCHEMA (prisma/schema.prisma) trước khi viết:
// - KHÔNG có model "Wallet"/"Buyer" riêng — số dư nằm THẲNG trên
//   User.walletBalance (Int, @default(0)). "Buyer" chỉ là 1 giá trị của
//   User.role (String, mặc định "BUYER"), không phải model riêng.
// - KHÔNG có cờ "tài khoản test" nào trong model User (đã rà toàn bộ field)
//   — đánh dấu bằng tiền tố "[TEST]" trong `name` + username rõ ràng thay vì
//   thêm cột mới (thêm cột sẽ cần migration, ngoài phạm vi 1 script chạy 1
//   lần).
// - Nguồn tiền ghi qua 1 dòng WalletTransaction THẬT (không giả làm giao
//   dịch nạp), dùng type="ADJUSTMENT" (giá trị MỚI, KHÁC "DEPOSIT" — cố ý:
//   getAdminFinancialHealth() ở src/lib/queries.ts CHỈ sum
//   type="DEPOSIT"+status="CONFIRMED" cho báo cáo tài chính, dùng "DEPOSIT"
//   ở đây sẽ làm sai lệch số liệu "tổng đã nạp thật" của sàn) +
//   method="manual_test_credit" (giá trị MỚI, KHÔNG trùng "bank"/"sepay"/
//   "usdt"/"vnpay" đang dùng cho nạp tiền thật). Vì cùng lý do, dòng này
//   cũng KHÔNG hiện trong "Lịch sử nạp tiền" của buyer (GET
//   /api/wallet/transactions lọc cứng type="DEPOSIT") — tách bạch rõ ràng
//   với giao dịch nạp thật, đúng yêu cầu "để sổ sách phân biệt được".
//
// ============================================================
// SỬA 3 GIÁ TRỊ NÀY THEO Ý BẠN TRƯỚC KHI CHẠY
// ============================================================
const BUYER_EMAIL = "test-buyer@marketmmo.pro";
const BUYER_PASSWORD = "TestBuyer@123";
const CREDIT_AMOUNT_VND = 1_000_000;
// ============================================================

const BUYER_USERNAME = "test-buyer";
const BUYER_NAME = "[TEST] Buyer Test";
// Đánh dấu riêng cho dòng WalletTransaction để script tự nhận biết "đã cấp
// tiền cho tài khoản này chưa" ở lần chạy sau — KHÔNG đổi 2 giá trị này nếu
// đã chạy script 1 lần, đổi sẽ khiến script không nhận ra khoản đã cấp
// trước đó và cộng thêm 1 lần nữa.
const CREDIT_TYPE = "ADJUSTMENT";
const CREDIT_METHOD = "manual_test_credit";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Tạo user nếu chưa có — IDEMPOTENT theo email (User.email @unique).
  //    Nếu tài khoản đã tồn tại, KHÔNG đụng gì tới passwordHash/walletBalance
  //    hiện có (update: {} — cùng convention với prisma/seed.ts). Muốn đổi
  //    mật khẩu tài khoản đã tồn tại: sửa tay qua Prisma Studio/SQL, script
  //    này không ghi đè để tránh vô tình reset mật khẩu bạn đã đổi sau đó.
  const passwordHash = await bcrypt.hash(BUYER_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: BUYER_EMAIL },
    update: {},
    create: {
      email: BUYER_EMAIL,
      username: BUYER_USERNAME,
      name: BUYER_NAME,
      passwordHash,
      role: "BUYER",
      walletBalance: 0,
    },
  });
  console.log(`User: ${user.email} (id=${user.id}) — walletBalance hiện tại: ${user.walletBalance}đ`);

  // 2) Cộng CREDIT_AMOUNT_VND vào ví — CHỈ 1 LẦN DUY NHẤT. IDEMPOTENT: kiểm
  //    tra đã có dòng WalletTransaction đánh dấu (CREDIT_TYPE, CREDIT_METHOD)
  //    cho user này chưa; có rồi thì bỏ qua hẳn (không chạy lại dù đổi
  //    CREDIT_AMOUNT_VND — xem comment ở khai báo hằng số phía trên).
  const existingCredit = await prisma.walletTransaction.findFirst({
    where: { userId: user.id, type: CREDIT_TYPE, method: CREDIT_METHOD },
  });

  if (existingCredit) {
    console.log(
      `Đã có khoản test-credit trước đó (id=${existingCredit.id}, +${existingCredit.amount}đ, ${existingCredit.createdAt.toISOString()}) — BỎ QUA, không cộng thêm.`
    );
  } else {
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { walletBalance: { increment: CREDIT_AMOUNT_VND } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: user.id,
          type: CREDIT_TYPE,
          amount: CREDIT_AMOUNT_VND,
          status: "CONFIRMED",
          method: CREDIT_METHOD,
          note:
            "Manual test credit — KHÔNG phải giao dịch nạp tiền thật (không qua VNPay/SePay/USDT/bank). " +
            "Cấp thủ công bằng scripts/create-test-buyer.ts để test luồng mua hàng trước khi mở sàn.",
          confirmedAt: new Date(),
        },
      }),
    ]);
    console.log(`Đã cộng +${CREDIT_AMOUNT_VND.toLocaleString("vi-VN")}đ — walletBalance mới: ${updatedUser.walletBalance.toLocaleString("vi-VN")}đ`);
  }

  console.log("\nXong. Đăng nhập test bằng:");
  console.log(`  Email:    ${BUYER_EMAIL}`);
  console.log(`  Mật khẩu: ${BUYER_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Script thất bại:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
