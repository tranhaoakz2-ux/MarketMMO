// Script CHẠY 1 LẦN (không tự động) — ĐỔI TOÀN BỘ User.memberCode hiện có
// (kể cả tài khoản đã có mã theo định dạng CŨ "MMO000001" tuần tự) sang định
// dạng MỚI ngẫu nhiên "MM" + 8 chữ số (vd "MM48273910"), và cấp mã cho tài
// khoản nào còn thiếu. Chạy bằng:
//
//   npx tsx scripts/backfill-member-codes.ts
//
// AN TOÀN CHẠY LẠI (idempotent theo nghĩa không lỗi khi chạy nhiều lần) —
// nhưng LƯU Ý: mỗi lần chạy sẽ SINH LẠI mã mới cho MỌI tài khoản (không giữ
// mã cũ), khác hẳn quy ước "memberCode cố định vĩnh viễn" áp dụng cho vận
// hành bình thường (đăng ký/OAuth chỉ gán 1 lần qua ensureMemberCode()) — chỉ
// chạy script này khi thật sự cần đổi HÀNG LOẠT sang định dạng mới, không
// chạy tuỳ tiện nhiều lần trên production.
//
// Dùng reassignMemberCode() (src/lib/member-code.ts) — LUÔN gán mã mới dù
// user đã có mã (khác ensureMemberCode() dùng lúc đăng ký, chỉ gán khi chưa
// có) — gọi TUẦN TỰ (không Promise.all) để log rõ ràng từng dòng, không cần
// thiết phải song song vì đây là script chạy tay 1 lần, không nhạy cảm thời
// gian.
import { prisma } from "@/lib/prisma";
import { reassignMemberCode } from "@/lib/member-code";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, username: true, memberCode: true },
  });

  console.log(`Tìm thấy ${users.length} tài khoản. Bắt đầu đổi sang mã ngẫu nhiên định dạng mới...\n`);

  let done = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const newCode = await reassignMemberCode(u.id);
      console.log(`- ${u.memberCode ?? "(chưa có)"} -> ${newCode}   ${u.email ?? u.username ?? u.id}`);
      done++;
    } catch (err) {
      console.error(`- LỖI đổi mã cho ${u.email ?? u.username ?? u.id}:`, err);
      failed++;
    }
  }

  console.log(`\nXong. Đã đổi: ${done} · Lỗi: ${failed}.`);
}

main()
  .catch((err) => {
    console.error("Script thất bại:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
