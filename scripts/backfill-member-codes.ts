// Script CHẠY 1 LẦN (không tự động) — cấp User.memberCode cho TOÀN BỘ tài
// khoản đã tồn tại trước khi có tính năng này, THEO ĐÚNG THỨ TỰ TẠO TÀI
// KHOẢN (createdAt tăng dần) để số nhỏ nhất luôn ứng với tài khoản cũ nhất.
// Chạy bằng:
//
//   npx tsx scripts/backfill-member-codes.ts
//
// Idempotent — chạy lại an toàn: chỉ xử lý user CHƯA có memberCode
// (memberCode: null), user đã có (kể cả do đăng ký mới/OAuth chạy song song
// trong lúc backfill) được bỏ qua. Dùng LẠI đúng ensureMemberCode() ở
// src/lib/member-code.ts (không viết logic cấp mã riêng) — mỗi lần gọi tăng
// bộ đếm nguyên tử 1 nấc, gọi TUẦN TỰ (không Promise.all) theo đúng thứ tự
// createdAt để số cấp ra luôn tăng dần đúng thứ tự tài khoản.
import { prisma } from "@/lib/prisma";
import { ensureMemberCode } from "@/lib/member-code";

async function main() {
  const users = await prisma.user.findMany({
    where: { memberCode: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, username: true, createdAt: true },
  });

  console.log(`Tìm thấy ${users.length} tài khoản chưa có mã thành viên. Bắt đầu cấp...\n`);

  let done = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const code = await ensureMemberCode(u.id);
      console.log(`- ${code}  ${u.email ?? u.username ?? u.id}  (tạo lúc ${u.createdAt.toISOString()})`);
      done++;
    } catch (err) {
      console.error(`- LỖI cấp mã cho ${u.email ?? u.username ?? u.id}:`, err);
      failed++;
    }
  }

  console.log(`\nXong. Đã cấp: ${done} · Lỗi: ${failed}.`);
}

main()
  .catch((err) => {
    console.error("Script thất bại:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
