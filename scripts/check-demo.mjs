// Script DÒ (dry-run) — CHỈ ĐỌC, KHÔNG XOÁ GÌ.
//
// PHẠM VI (PHƯƠNG ÁN B, chốt 2026-08-29): xoá TOÀN BỘ tài khoản + dữ liệu,
// CHỈ GIỮ LẠI 18 email whitelist + admin@marketmmo.pro (+ bot hệ thống, hạ
// tầng) + Category + cấu hình hệ thống. Hội thoại/tin nhắn TEST giữa 1 tài
// khoản-xoá và ADMIN KHÔNG còn chặn xoá (được phép xoá kèm) — chỉ hội thoại
// với 1 trong 18 WHITELIST mới còn chặn. Logic nhận diện dùng CHUNG với
// cleanup-demo.mjs qua scripts/_demo-shared.mjs — cố ý, để 2 script không
// bao giờ lệch nhau về "ai bị xoá/ai được giữ/xung đột".
//
// CHẠY (PowerShell, trỏ thẳng vào Neon production — thay connection string
// thật của bạn vào, KHÔNG dùng .env cục bộ vì .env trỏ Docker local):
//
//   $env:DATABASE_URL = "postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require"
//   node scripts/check-demo.mjs
//   Remove-Item Env:\DATABASE_URL
//
// Dòng ĐẦU TIÊN in ra là host database đang kết nối (đã che mật khẩu) — XÁC
// NHẬN đúng là host Neon production trước khi tin bất kỳ dòng nào sau đó.
import { PrismaClient } from "@prisma/client";
import { identifyPurgeScope, maskDatabaseUrl, normEmail, WHITELIST_EMAILS, KEEP_ADMIN_EMAIL, SYSTEM_BOT_EMAIL } from "./_demo-shared.mjs";

const prisma = new PrismaClient();

function line() {
  console.log("─".repeat(78));
}
function money(n) {
  return new Intl.NumberFormat("vi-VN").format(Number(n ?? 0)) + "đ";
}

async function main() {
  console.log("=".repeat(78));
  console.log("DATABASE ĐANG KẾT NỐI (mật khẩu đã che):");
  console.log("  " + maskDatabaseUrl(process.env.DATABASE_URL));
  console.log("=".repeat(78));
  console.log("\n>>> XÁC NHẬN ĐÚNG NEON PRODUCTION trước khi đọc tiếp kết quả bên dưới. <<<\n");

  const scope = await identifyPurgeScope(prisma);
  const {
    allUsers,
    keepUsers,
    adminUsers,
    keepAdminUser,
    otherAdminsBeingDeleted,
    missingWhitelistEmails,
    candidateDeleteUsers,
    protectedUsers,
    protectedUserIds,
    purgeUsers,
    purgeUserIds,
    purgeSellerIds,
    conflicts,
  } = scope;

  const whitelistMatched = WHITELIST_EMAILS.size - missingWhitelistEmails.length;
  const expectedKeepCount = whitelistMatched + (keepAdminUser ? 1 : 0); // KHÔNG tính bot — báo riêng

  line();
  console.log("### TỔNG QUAN");
  console.log(`Tổng số tài khoản trong DB: ${allUsers.length}`);
  console.log(`Tài khoản GIỮ LẠI: ${keepUsers.length} (mục tiêu: ${whitelistMatched} whitelist + ${keepAdminUser ? 1 : 0} admin = ${expectedKeepCount}, cộng thêm bot hệ thống nếu tồn tại)`);
  console.log(`  - Admin giữ lại (${KEEP_ADMIN_EMAIL}): ${keepAdminUser ? `✅ tìm thấy, userId=${keepAdminUser.id}` : "🔴 KHÔNG TÌM THẤY — kiểm tra lại email này có đúng không trước khi tiếp tục!"}`);
  console.log(`  - Khớp whitelist: ${whitelistMatched}/${WHITELIST_EMAILS.size}`);
  if (missingWhitelistEmails.length > 0) {
    console.log(`  ⚠️  ${missingWhitelistEmails.length} email whitelist KHÔNG tìm thấy trong DB (không sao — chỉ là chưa từng đăng ký, không ảnh hưởng gì):`);
    for (const e of missingWhitelistEmails) console.log(`      - ${e}`);
  }
  console.log(`\nỨng viên XOÁ (không thuộc tập giữ): ${candidateDeleteUsers.length}`);
  console.log(`  - BỊ CHẶN (bảo vệ vì dính whitelist/admin, KHÔNG xoá gì của họ): ${protectedUsers.length}`);
  console.log(`  - AN TOÀN ĐỂ XOÁ (không dính gì tới whitelist/admin): ${purgeUsers.length}`);
  line();

  console.log("\n### DANH SÁCH TÀI KHOẢN GIỮ LẠI");
  for (const u of keepUsers) {
    const tag = normEmail(u.email) === SYSTEM_BOT_EMAIL ? " [BOT HỆ THỐNG — không tính vào 18+1]" : "";
    console.log(`  ✅ ${u.email ?? "(không có email)"} — role=${u.role} userId=${u.id}${u.seller ? ` sellerId=${u.seller.id} shopName=${u.seller.shopName}` : ""}${tag}`);
  }

  if (otherAdminsBeingDeleted.length > 0) {
    line();
    console.log(`### ⚠️  TÀI KHOẢN ADMIN KHÁC SẼ BỊ XOÁ (role=ADMIN nhưng khác ${KEEP_ADMIN_EMAIL}): ${otherAdminsBeingDeleted.length}`);
    console.log("    (đây là thay đổi có chủ đích theo yêu cầu — chỉ liệt kê lại để bạn xác nhận đúng người)");
    for (const u of otherAdminsBeingDeleted) {
      const status = protectedUserIds.has(u.id) ? "❌ BỊ CHẶN (xem lý do ở mục bên dưới)" : "🗑️ sẽ bị xoá";
      console.log(`  - ${u.email} — userId=${u.id}${u.seller ? ` sellerId=${u.seller.id} shopName=${u.seller.shopName}` : ""} — ${status}`);
    }
  }

  line();
  console.log(`### TÀI KHOẢN BỊ BẢO VỆ (không xoá — có dữ liệu dính whitelist/admin): ${protectedUsers.length}`);
  for (const u of protectedUsers) {
    console.log(`\n  ❌ BỎ QUA: ${u.email ?? "(không có email)"} — role=${u.role} userId=${u.id}${u.seller ? ` sellerId=${u.seller.id} shopName=${u.seller.shopName}` : ""}`);
    for (const reason of protectedUserIds.get(u.id)) {
      console.log(`       - ${reason}`);
    }
  }

  line();
  console.log(`### TÀI KHOẢN SẼ BỊ XOÁ (${purgeUsers.length}) — an toàn tuyệt đối, không dính whitelist/admin`);
  for (const u of purgeUsers.slice(0, 50)) {
    console.log(`  🗑️  ${u.email ?? "(không có email)"} — role=${u.role} userId=${u.id}${u.seller ? ` sellerId=${u.seller.id} shopName=${u.seller.shopName}` : ""}`);
  }
  if (purgeUsers.length > 50) console.log(`  ... và ${purgeUsers.length - 50} tài khoản khác`);

  // ---- Đếm dữ liệu con sẽ bị xoá theo tập purgeUserIds/purgeSellerIds ----
  line();
  console.log("### SỐ BẢN GHI SẼ BỊ XOÁ (thuộc tập AN TOÀN ở trên)");
  const [
    ordersToDelete,
    walletTxToDelete,
    productsToDelete,
    reviewsToDelete,
    forumPostsToDelete,
    forumCommentsToDelete,
    forumLikesToDelete,
    conversationsToDelete,
    disputesToDelete,
  ] = await Promise.all([
    prisma.order.count({ where: { buyerId: { in: purgeUserIds } } }),
    prisma.walletTransaction.count({ where: { userId: { in: purgeUserIds } } }),
    purgeSellerIds.length ? prisma.product.count({ where: { sellerId: { in: purgeSellerIds } } }) : 0,
    prisma.review.count({ where: { OR: [{ userId: { in: purgeUserIds } }, { seller: { userId: { in: purgeUserIds } } }] } }),
    prisma.forumPost.count({ where: { authorId: { in: purgeUserIds } } }),
    prisma.forumComment.count({ where: { authorId: { in: purgeUserIds } } }),
    prisma.forumLike.count({ where: { userId: { in: purgeUserIds } } }),
    prisma.conversation.count({ where: { OR: [{ userAId: { in: purgeUserIds } }, { userBId: { in: purgeUserIds } }] } }),
    prisma.dispute.count({ where: { openedById: { in: purgeUserIds } } }),
  ]);
  console.log(`  Order (buyer thuộc tập xoá):            ${ordersToDelete}`);
  console.log(`  WalletTransaction (thuộc tập xoá):        ${walletTxToDelete}`);
  console.log(`  Product (thuộc seller trong tập xoá):     ${productsToDelete}`);
  console.log(`  Review (viết bởi/nhận bởi tập xoá):       ${reviewsToDelete}`);
  console.log(`  ForumPost (tác giả thuộc tập xoá):        ${forumPostsToDelete}`);
  console.log(`  ForumComment (tác giả thuộc tập xoá):     ${forumCommentsToDelete}`);
  console.log(`  ForumLike (thuộc tập xoá):                 ${forumLikesToDelete}`);
  console.log(`  Conversation (có phía thuộc tập xoá):     ${conversationsToDelete}`);
  console.log(`  Dispute (mở bởi tập xoá):                  ${disputesToDelete}`);

  // ---- PHƯƠNG ÁN B: liệt kê CHI TIẾT từng Conversation/Message sắp bị xoá,
  // để người dùng tự xác nhận không có nội dung THẬT trước khi duyệt BƯỚC 3.
  // Quy tắc an toàn (đã áp ở identifyPurgeScope): CHỈ xoá conversation có
  // ÍT NHẤT 1 bên thuộc purgeUserIds; hội thoại với 1 trong 18 whitelist vẫn
  // chặn (protectedUsers ở trên) — bên dưới CHỈ là những cái AN TOÀN để xoá.
  line();
  console.log(`### CHI TIẾT CONVERSATION/MESSAGE SẼ BỊ XOÁ (${conversationsToDelete})`);
  const conversationsWithMessages = purgeUserIds.length
    ? await prisma.conversation.findMany({
        where: { OR: [{ userAId: { in: purgeUserIds } }, { userBId: { in: purgeUserIds } }] },
        include: {
          userA: { select: { email: true } },
          userB: { select: { email: true } },
          messages: {
            select: { id: true, senderId: true, content: true, attachmentPath: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      })
    : [];
  let hasNonEmptyConversation = false;
  for (const c of conversationsWithMessages) {
    const msgCount = c.messages.length;
    if (msgCount > 0) hasNonEmptyConversation = true;
    console.log(`\n  conversationId=${c.id} ${c.userA.email} <-> ${c.userB.email} — ${msgCount} tin nhắn`);
    for (const m of c.messages) {
      const preview = (m.content || (m.attachmentPath ? "[đính kèm file/ảnh]" : "")).slice(0, 100).replace(/\s+/g, " ");
      console.log(`       [${m.createdAt.toISOString()}] senderId=${m.senderId}: "${preview}"`);
    }
  }
  if (hasNonEmptyConversation) {
    console.log(
      "\n⚠️  CÓ conversation sắp xoá chứa tin nhắn (không phải 0/rỗng) — ĐỌC KỸ nội dung preview ở trên. Nếu bất kỳ dòng nào là trao đổi THẬT (không phải test/debug), DỪNG LẠI và báo tôi biết conversationId cụ thể — KHÔNG duyệt BƯỚC 3 cho tới khi xác nhận."
    );
  } else {
    console.log("\n✅ Toàn bộ conversation sắp xoá đều 0 tin nhắn (rỗng) — an toàn.");
  }

  line();
  console.log("★★★ XUNG ĐỘT — DÍNH TỚI 18 WHITELIST/ADMIN (KHÔNG XOÁ) ★★★\n");
  let anyConflict = false;

  if (conflicts.orderCrossKeepSeller.length > 0) {
    anyConflict = true;
    console.log(`🔴 ${conflicts.orderCrossKeepSeller.length} OrderItem: 1 trong 18 whitelist/admin ĐÃ MUA từ 1 seller thuộc tập-xoá:`);
    for (const it of conflicts.orderCrossKeepSeller) {
      console.log(`   - orderItemId=${it.id} orderCode=${it.order.orderCode} buyer(whitelist)=${it.order.buyer.email} sản phẩm="${it.productName}" giá=${money(it.price * it.quantity)}`);
    }
  }
  if (conflicts.orderCrossKeepBuyer.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.orderCrossKeepBuyer.length} OrderItem: 1 tài khoản thuộc tập-xoá ĐÃ MUA từ seller thuộc 18 whitelist/admin:`);
    for (const it of conflicts.orderCrossKeepBuyer) {
      console.log(`   - orderItemId=${it.id} orderCode=${it.order.orderCode} sản phẩm="${it.productName}" giá=${money(it.price * it.quantity)}`);
    }
  }
  if (conflicts.reviewCrossKeepReviewer.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.reviewCrossKeepReviewer.length} Review: 1 trong 18 whitelist/admin đã viết review cho seller thuộc tập-xoá (xoá seller sẽ CASCADE mất review này):`);
    for (const r of conflicts.reviewCrossKeepReviewer) {
      console.log(`   - reviewId=${r.id} từ whitelist ${r.user.email} cho shop "${r.seller.shopName}" rating=${r.rating}`);
    }
  }
  if (conflicts.reviewCrossKeepSellerInfo.length > 0) {
    console.log(`\nℹ️  ${conflicts.reviewCrossKeepSellerInfo.length} Review (KHÔNG chặn, chỉ thông tin): tài khoản thuộc tập-xoá đã review cho seller thuộc 18 whitelist/admin — xoá tài khoản đó sẽ mất review này (giảm rating hiển thị của seller whitelist), không đụng gì khác thuộc whitelist:`);
    for (const r of conflicts.reviewCrossKeepSellerInfo) {
      console.log(`   - reviewId=${r.id} cho shop whitelist "${r.seller.shopName}" rating=${r.rating}`);
    }
  }
  if (conflicts.referralCross.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.referralCross.length} ReferralCommission nối 1 trong 18 whitelist/admin với 1 tài khoản thuộc tập-xoá:`);
    for (const r of conflicts.referralCross) {
      console.log(`   - id=${r.id} status=${r.status} amount=${money(r.commissionAmount)} referrer=${r.referrer.email} referredUser=${r.referredUser.email}`);
    }
  }
  if (conflicts.referredByCross.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.referredByCross.length} whitelist/admin có referredById trỏ vào 1 tài khoản thuộc tập-xoá:`);
    for (const r of conflicts.referredByCross) {
      console.log(`   - ${r.keepUserEmail} được giới thiệu bởi userId=${r.referredById}`);
    }
  }
  if (conflicts.conversationCross.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.conversationCross.length} Conversation giữa 1 trong 18 WHITELIST và 1 tài khoản thuộc tập-xoá (PHƯƠNG ÁN B: hội thoại với ADMIN không còn tính ở đây, xem mục riêng bên dưới):`);
    for (const c of conflicts.conversationCross) {
      console.log(`   - conversationId=${c.id} ${c.userA.email} <-> ${c.userB.email} — ${c._count.messages} tin nhắn`);
    }
  }
  if (conflicts.forumCross.length > 0) {
    anyConflict = true;
    console.log(`\n🔴 ${conflicts.forumCross.length} bình luận/thích/báo cáo của 1 trong 18 whitelist/admin trên bài forum của 1 tài khoản thuộc tập-xoá (Cascade khi xoá tác giả bài):`);
    for (const r of conflicts.forumCross) {
      const who = r.author?.email ?? r.user?.email ?? r.reporter?.email ?? "?";
      console.log(`   - loại=${r.type} bài="${r.postTitle}" từ whitelist/admin ${who} id=${r.id}`);
    }
  }
  if (conflicts.adminTableCross.length > 0) {
    // KHÔNG chặn — 4 field này Restrict nhưng KHÔNG đụng dữ liệu SỞ HỮU của
    // whitelist (chỉ là nhật ký "ai đổi cấu hình lúc nào"), cleanup-demo.mjs
    // sẽ xoá các dòng này TRƯỚC KHI xoá User admin cũ tương ứng.
    console.log(`\nℹ️  ${conflicts.adminTableCross.length} bản ghi ở bảng cấu hình (PlatformFeeSchedule/PlatformFeeChange/CommissionRateChange/AdminAuditLog) do 1 admin thuộc tập-xoá tạo — KHÔNG chặn, cleanup-demo.mjs sẽ xoá kèm các dòng này trước khi xoá tài khoản admin đó:`);
    for (const r of conflicts.adminTableCross) {
      console.log(`   - bảng=${r.table} id=${r.id}`);
    }
  }

  line();
  if (anyConflict) {
    console.log(`🔴 CÓ XUNG ĐỘT — ${protectedUsers.length} tài khoản ở trên sẽ được BỎ QUA HOÀN TOÀN khi chạy cleanup-demo.mjs.`);
    console.log("   Xem lại danh sách xung đột + danh sách tài khoản bị bảo vệ ở trên trước khi quyết định.");
  } else {
    console.log("✅ KHÔNG có xung đột nào — mọi tài khoản ứng viên xoá đều an toàn tuyệt đối để xoá.");
  }
  line();

  const hasBot = keepUsers.some((u) => normEmail(u.email) === SYSTEM_BOT_EMAIL);
  const keepOk = keepUsers.length - (hasBot ? 1 : 0) === expectedKeepCount;
  const otherAdminsPurged = otherAdminsBeingDeleted.filter((u) => !protectedUserIds.has(u.id)).length;
  console.log(
    `\nTÓM TẮT: giữ ${keepUsers.length} (${whitelistMatched} whitelist + ${keepAdminUser ? 1 : 0} admin${hasBot ? " + 1 bot hệ thống" : ""}) ${keepOk ? "✅ khớp mục tiêu 18+1" : "⚠️ KHÔNG khớp mục tiêu — kiểm tra lại!"} | bảo vệ (bỏ qua) ${protectedUsers.length} | sẽ xoá ${purgeUsers.length}${otherAdminsPurged ? ` (gồm ${otherAdminsPurged} admin cũ)` : ""} / tổng ${allUsers.length}.`
  );
  console.log("\nChưa xoá gì — đây là script chỉ đọc. Xem lại toàn bộ danh sách trên trước khi chạy scripts/cleanup-demo.mjs.");
}

main()
  .catch((err) => {
    console.error("\nScript LỖI (chưa xoá gì, chỉ đọc):", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
