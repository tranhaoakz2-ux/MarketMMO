// Script XOÁ THẬT — chỉ chạy SAU KHI đã chạy scripts/check-demo.mjs trên
// Neon, xem output "XUNG ĐỘT = 0" và tự tay xác nhận. KHÔNG dùng raw SQL
// DELETE — chỉ dùng Prisma Client, tôn trọng đúng khoá ngoại thật của
// prisma/schema.prisma. Toàn bộ thao tác xoá bọc trong 1 $transaction — lỗi
// ở bất kỳ bước nào thì ROLLBACK TOÀN BỘ, không để lại trạng thái nửa vời.
//
// PHẠM VI (PHƯƠNG ÁN B, chốt 2026-08-29): xoá TOÀN BỘ tài khoản + dữ liệu,
// CHỈ GIỮ LẠI 18 email whitelist + admin@marketmmo.pro + bot hệ thống +
// Category + cấu hình hệ thống. Logic nhận diện dùng CHUNG với
// check-demo.mjs qua scripts/_demo-shared.mjs (identifyPurgeScope) — script
// này gọi LẠI hàm đó (đọc tươi ngay trước khi xoá), KHÔNG tin kết quả
// check-demo.mjs chạy trước đó — nếu còn BẤT KỲ tài khoản nào bị bảo vệ
// (dính whitelist/admin), script DỪNG NGAY, KHÔNG xoá gì cả.
//
// CHẠY (PowerShell, trỏ thẳng vào Neon production — ĐÃ tạo Neon branch sao
// lưu trước khi chạy dòng dưới):
//
//   $env:DATABASE_URL = "postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require"
//   node scripts/cleanup-demo.mjs
//   Remove-Item Env:\DATABASE_URL
//
// Dòng ĐẦU TIÊN in ra là host database đang kết nối (đã che mật khẩu) — XÁC
// NHẬN đúng là host Neon production trước khi để script chạy tiếp.
import { PrismaClient } from "@prisma/client";
import {
  identifyPurgeScope,
  maskDatabaseUrl,
  normEmail,
  WHITELIST_EMAILS,
  KEEP_ADMIN_EMAIL,
  SYSTEM_BOT_EMAIL,
} from "./_demo-shared.mjs";

const prisma = new PrismaClient();

function line() {
  console.log("─".repeat(78));
}

async function main() {
  console.log("=".repeat(78));
  console.log("DATABASE ĐANG KẾT NỐI (mật khẩu đã che):");
  console.log("  " + maskDatabaseUrl(process.env.DATABASE_URL));
  console.log("=".repeat(78));
  console.log("\n>>> XÁC NHẬN ĐÚNG NEON PRODUCTION trước khi để script chạy tiếp. <<<\n");

  // --------------------------------------------------------------------------
  // 1) ĐỌC TƯƠI trạng thái ngay lúc này — KHÔNG tin kết quả check-demo.mjs
  //    chạy trước đó (có thể đã có thay đổi ở giữa 2 lần chạy).
  // --------------------------------------------------------------------------
  const scope = await identifyPurgeScope(prisma);
  const { keepUsers, keepAdminUser, protectedUsers, protectedUserIds, purgeUsers, purgeUserIds, purgeSellerIds } = scope;

  line();
  console.log(`Tài khoản GIỮ LẠI: ${keepUsers.length}`);
  console.log(`Tài khoản SẼ XOÁ (an toàn tuyệt đối): ${purgeUsers.length}`);
  console.log(`Tài khoản BỊ BẢO VỆ (không xoá): ${protectedUsers.length}`);
  line();

  // --------------------------------------------------------------------------
  // 2) CỔNG AN TOÀN #1 — không có admin giữ lại thì DỪNG NGAY.
  // --------------------------------------------------------------------------
  if (!keepAdminUser) {
    console.error(`❌ DỪNG: không tìm thấy tài khoản admin ${KEEP_ADMIN_EMAIL} trong DB. Kiểm tra lại trước khi chạy tiếp. CHƯA xoá gì.`);
    process.exitCode = 1;
    return;
  }

  // --------------------------------------------------------------------------
  // 3) CỔNG AN TOÀN #2 — còn BẤT KỲ tài khoản nào bị bảo vệ thì DỪNG NGAY,
  //    KHÔNG xoá gì cả (kể cả phần "sạch" khác) — an toàn tuyệt đối, đúng
  //    tiền đề "0 xung đột" đã được xác nhận qua check-demo.mjs.
  // --------------------------------------------------------------------------
  if (protectedUsers.length > 0) {
    console.error(`❌ DỪNG: còn ${protectedUsers.length} tài khoản bị bảo vệ (dính whitelist/admin) — KHÔNG xoá gì cả:`);
    for (const u of protectedUsers) {
      console.error(`\n  ❌ ${u.email ?? "(không có email)"} — userId=${u.id}`);
      for (const reason of protectedUserIds.get(u.id)) console.error(`       - ${reason}`);
    }
    console.error("\nChạy lại scripts/check-demo.mjs, xử lý xong các xung đột trên rồi mới chạy lại script này.");
    process.exitCode = 1;
    return;
  }

  // --------------------------------------------------------------------------
  // 4) CỔNG AN TOÀN #3 — RÀ ĐỘC LẬP lần nữa từng user trong purgeUsers, KHÔNG
  //    tin purgeUsers đã lọc đúng (defense in depth thật sự — kiểm tra lại từ
  //    đầu, không phụ thuộc vào logic identifyPurgeScope() có đúng hay không).
  // --------------------------------------------------------------------------
  for (const u of purgeUsers) {
    const email = normEmail(u.email);
    if (WHITELIST_EMAILS.has(email)) {
      throw new Error(`DỪNG KHẨN CẤP: tài khoản trong danh sách XOÁ (${email}) lại nằm trong WHITELIST. KHÔNG xoá gì, báo lại ngay.`);
    }
    if (email === KEEP_ADMIN_EMAIL) {
      throw new Error(`DỪNG KHẨN CẤP: tài khoản trong danh sách XOÁ lại chính là admin giữ lại (${KEEP_ADMIN_EMAIL}). KHÔNG xoá gì, báo lại ngay.`);
    }
    if (email === SYSTEM_BOT_EMAIL) {
      throw new Error(`DỪNG KHẨN CẤP: tài khoản trong danh sách XOÁ lại chính là bot hệ thống. KHÔNG xoá gì, báo lại ngay.`);
    }
  }
  console.log("✅ Rà độc lập lần 2: không có tài khoản nào trong danh sách XOÁ trùng whitelist/admin/bot.");

  if (purgeUsers.length === 0) {
    console.log("\nKhông có gì để xoá (purgeUsers rỗng). Dừng, không làm gì thêm.");
    return;
  }

  // --------------------------------------------------------------------------
  // 5) PHƯƠNG ÁN B — liệt kê chi tiết Conversation/Message sắp xoá lần cuối
  //    (đã được bạn duyệt ở check-demo.mjs, in lại đây để có trong log chạy
  //    thật). Quy tắc an toàn: CHỈ xoá conversation có >=1 bên trong
  //    purgeUserIds — identifyPurgeScope() đã đảm bảo KHÔNG còn conversation
  //    nào giữa purgeUserIds và 1 trong 18 whitelist (nếu còn, tài khoản đó
  //    đã bị protect() ở bước 3 và toàn bộ script đã dừng rồi).
  // --------------------------------------------------------------------------
  const conversationsToDelete = await prisma.conversation.findMany({
    where: { OR: [{ userAId: { in: purgeUserIds } }, { userBId: { in: purgeUserIds } }] },
    include: {
      userA: { select: { email: true } },
      userB: { select: { email: true } },
      _count: { select: { messages: true } },
    },
  });
  line();
  console.log(`### Conversation sẽ bị xoá: ${conversationsToDelete.length}`);
  let totalMessages = 0;
  for (const c of conversationsToDelete) {
    totalMessages += c._count.messages;
    // Rà buộc lại lần cuối — counterpart (bên còn lại nếu không phải purge)
    // TUYỆT ĐỐI không được là 1 trong 18 whitelist.
    const otherEmail = purgeUserIds.includes(c.userAId) ? c.userB.email : c.userA.email;
    if (WHITELIST_EMAILS.has(normEmail(otherEmail))) {
      throw new Error(`DỪNG KHẨN CẤP: conversationId=${c.id} có bên whitelist (${otherEmail}) lại nằm trong danh sách sẽ xoá. KHÔNG xoá gì, báo lại ngay.`);
    }
    console.log(`  - ${c.userA.email} <-> ${c.userB.email} — ${c._count.messages} tin nhắn`);
  }
  console.log(`Tổng tin nhắn sẽ bị xoá: ${totalMessages}`);
  line();

  console.log(`\nBẮT ĐẦU XOÁ — ${purgeUsers.length} tài khoản, trong 1 transaction (rollback toàn bộ nếu lỗi giữa chừng)...\n`);

  // --------------------------------------------------------------------------
  // 6) TRANSACTION — đếm TRƯỚC (bảng chỉ cascade, không gọi deleteMany riêng)
  //    rồi xoá ĐÚNG THỨ TỰ khoá ngoại: children trước, cha sau (Restrict FK
  //    chặn ngược lại nếu sai thứ tự) — xem comment giải thích parent/child ở
  //    docs đã trao đổi. Timeout transaction nới rộng vì Neon + nhiều bảng.
  // --------------------------------------------------------------------------
  const report = await prisma.$transaction(
    async (tx) => {
      const r = {};

      // ---- 6a) ĐẾM các bảng chỉ bị xoá qua CASCADE (không deleteMany riêng) ----
      r.orderItem = await tx.orderItem.count({ where: { order: { buyerId: { in: purgeUserIds } } } });
      r.serviceIntake = await tx.serviceIntake.count({ where: { orderItem: { order: { buyerId: { in: purgeUserIds } } } } });
      r.dispute = await tx.dispute.count({ where: { orderItem: { order: { buyerId: { in: purgeUserIds } } } } });
      r.orderStatusHistory = await tx.orderStatusHistory.count({ where: { orderItem: { order: { buyerId: { in: purgeUserIds } } } } });
      r.deliveredPayloadAccessLog = await tx.deliveredPayloadAccessLog.count({ where: { buyerId: { in: purgeUserIds } } });
      r.referralCommission = await tx.referralCommission.count({ where: { OR: [{ referrerId: { in: purgeUserIds } }, { referredUserId: { in: purgeUserIds } }] } });
      r.serverDetail = await tx.serverDetail.count({ where: { product: { sellerId: { in: purgeSellerIds } } } });
      r.serviceFieldDefinition = await tx.serviceFieldDefinition.count({ where: { product: { sellerId: { in: purgeSellerIds } } } });
      r.productVariant = await tx.productVariant.count({ where: { product: { sellerId: { in: purgeSellerIds } } } });
      r.review = await tx.review.count({ where: { OR: [{ userId: { in: purgeUserIds } }, { seller: { userId: { in: purgeUserIds } } }] } });
      r.discountCode = await tx.discountCode.count({ where: { seller: { userId: { in: purgeUserIds } } } });
      r.serviceCredentialAccessLog = await tx.serviceCredentialAccessLog.count({ where: { seller: { userId: { in: purgeUserIds } } } });
      r.sellerLevelHistory = await tx.sellerLevelHistory.count({ where: { seller: { userId: { in: purgeUserIds } } } });
      r.account = await tx.account.count({ where: { userId: { in: purgeUserIds } } });
      r.session = await tx.session.count({ where: { userId: { in: purgeUserIds } } });
      r.passwordResetToken = await tx.passwordResetToken.count({ where: { userId: { in: purgeUserIds } } });
      r.forumPost = await tx.forumPost.count({ where: { authorId: { in: purgeUserIds } } });
      r.forumComment = await tx.forumComment.count({ where: { OR: [{ authorId: { in: purgeUserIds } }, { post: { authorId: { in: purgeUserIds } } }] } });
      r.forumLike = await tx.forumLike.count({ where: { OR: [{ userId: { in: purgeUserIds } }, { post: { authorId: { in: purgeUserIds } } }] } });
      r.forumReport = await tx.forumReport.count({
        where: {
          OR: [
            { reporterId: { in: purgeUserIds } },
            { post: { authorId: { in: purgeUserIds } } },
            { comment: { authorId: { in: purgeUserIds } } },
            { comment: { post: { authorId: { in: purgeUserIds } } } },
          ],
        },
      });
      r.usdtDepositIntent = await tx.usdtDepositIntent.count({ where: { userId: { in: purgeUserIds } } });
      r.message = await tx.message.count({ where: { OR: [{ conversation: { userAId: { in: purgeUserIds } } }, { conversation: { userBId: { in: purgeUserIds } } }] } });

      // ---- 6b) XOÁ THẬT — đúng thứ tự: children trước cha (Restrict FK) ----

      // Conversation (Cascade -> Message tự động) — PHƯƠNG ÁN B, đã rà lại ở
      // bước 5 phía trên (không còn dính whitelist).
      r.conversation = (await tx.conversation.deleteMany({
        where: { OR: [{ userAId: { in: purgeUserIds } }, { userBId: { in: purgeUserIds } }] },
      })).count;

      // AuctionBid trước Product/Seller (Restrict FK cả 2 chiều).
      r.auctionBid = (await tx.auctionBid.deleteMany({ where: { sellerId: { in: purgeSellerIds } } })).count;

      // ProductStockItem trước Product (Restrict FK — xem comment trong schema.prisma).
      r.productStockItem = (await tx.productStockItem.deleteMany({ where: { product: { sellerId: { in: purgeSellerIds } } } })).count;

      // Order trước Product (OrderItem.product là Restrict FK) — Cascade kéo
      // theo OrderItem -> ServiceIntake/Dispute/OrderStatusHistory/
      // DeliveredPayloadAccessLog/ReferralCommission(order).
      r.order = (await tx.order.deleteMany({ where: { buyerId: { in: purgeUserIds } } })).count;

      // WalletTransaction — Restrict FK tới User, phải xoá trước khi xoá User.
      r.walletTransaction = (await tx.walletTransaction.deleteMany({ where: { userId: { in: purgeUserIds } } })).count;

      // Product sau khi đã dọn sạch AuctionBid/ProductStockItem/OrderItem
      // tham chiếu tới nó — Cascade kéo theo ServerDetail/ServiceFieldDefinition/
      // ProductVariant; SetNull Review.productId.
      r.product = (await tx.product.deleteMany({ where: { sellerId: { in: purgeSellerIds } } })).count;

      // Seller sau Product (Product.seller Restrict) — Cascade kéo theo
      // DiscountCode/ServiceCredentialAccessLog/SellerLevelHistory/Review(seller);
      // SetNull Category.proposedById (KHÔNG đụng Category).
      r.seller = (await tx.seller.deleteMany({ where: { userId: { in: purgeUserIds } } })).count;

      // Bảng cấu hình chỉ admin thao tác — Restrict FK bắt buộc (không nullable),
      // phải xoá trước khi xoá User admin cũ (vd huynhthilananh99@gmail.com).
      r.platformFeeSchedule = (await tx.platformFeeSchedule.deleteMany({ where: { createdById: { in: purgeUserIds } } })).count;
      r.platformFeeChange = (await tx.platformFeeChange.deleteMany({ where: { changedById: { in: purgeUserIds } } })).count;
      r.commissionRateChange = (await tx.commissionRateChange.deleteMany({ where: { changedById: { in: purgeUserIds } } })).count;
      r.adminAuditLog = (await tx.adminAuditLog.deleteMany({ where: { adminId: { in: purgeUserIds } } })).count;

      // User.referredById tự tham chiếu (Restrict) — gỡ trước khi xoá User.
      // CHỈ đụng user nào có referredById trỏ vào purgeUserIds (đã đảm bảo
      // không phải whitelist/admin — nếu là whitelist/admin thì đã bị chặn ở
      // bước 3 identifyPurgeScope()).
      r.referredByNulled = (await tx.user.updateMany({ where: { referredById: { in: purgeUserIds } }, data: { referredById: null } })).count;

      // User — cuối cùng. Cascade kéo theo Account/Session/PasswordResetToken/
      // Review(user)/ForumPost(author, kéo theo ForumComment/ForumLike/
      // ForumReport trên bài đó)/ForumComment(author)/ForumLike(user)/
      // ForumReport(reporter)/ReferralCommission(referrer/referredUser còn
      // lại)/DeliveredPayloadAccessLog(buyer)/UsdtDepositIntent(user).
      r.user = (await tx.user.deleteMany({ where: { id: { in: purgeUserIds } } })).count;

      return r;
    },
    { timeout: 600_000, maxWait: 30_000 }
  );

  // --------------------------------------------------------------------------
  // 7) BÁO CÁO số bản ghi đã xoá từng bảng.
  // --------------------------------------------------------------------------
  line();
  console.log("✅ HOÀN TẤT — số bản ghi đã xoá từng bảng:\n");
  console.log(`  User:                         ${report.user}`);
  console.log(`  Seller:                       ${report.seller}`);
  console.log(`  Product:                      ${report.product}`);
  console.log(`  ProductVariant (cascade):     ${report.productVariant}`);
  console.log(`  ServerDetail (cascade):       ${report.serverDetail}`);
  console.log(`  ServiceFieldDefinition (cascade): ${report.serviceFieldDefinition}`);
  console.log(`  ProductStockItem:             ${report.productStockItem}`);
  console.log(`  AuctionBid:                   ${report.auctionBid}`);
  console.log(`  DiscountCode (cascade):       ${report.discountCode}`);
  console.log(`  ServiceCredentialAccessLog (cascade): ${report.serviceCredentialAccessLog}`);
  console.log(`  SellerLevelHistory (cascade): ${report.sellerLevelHistory}`);
  console.log(`  Order:                        ${report.order}`);
  console.log(`  OrderItem (cascade):          ${report.orderItem}`);
  console.log(`  ServiceIntake (cascade):      ${report.serviceIntake}`);
  console.log(`  Dispute (cascade):            ${report.dispute}`);
  console.log(`  OrderStatusHistory (cascade): ${report.orderStatusHistory}`);
  console.log(`  DeliveredPayloadAccessLog (cascade): ${report.deliveredPayloadAccessLog}`);
  console.log(`  ReferralCommission (cascade): ${report.referralCommission}`);
  console.log(`  WalletTransaction:            ${report.walletTransaction}`);
  console.log(`  Review (cascade):             ${report.review}`);
  console.log(`  ForumPost (cascade):          ${report.forumPost}`);
  console.log(`  ForumComment (cascade):       ${report.forumComment}`);
  console.log(`  ForumLike (cascade):          ${report.forumLike}`);
  console.log(`  ForumReport (cascade):        ${report.forumReport}`);
  console.log(`  Conversation:                 ${report.conversation}`);
  console.log(`  Message (cascade):            ${report.message}`);
  console.log(`  Account (cascade):            ${report.account}`);
  console.log(`  Session (cascade):            ${report.session}`);
  console.log(`  PasswordResetToken (cascade): ${report.passwordResetToken}`);
  console.log(`  UsdtDepositIntent (cascade):  ${report.usdtDepositIntent}`);
  console.log(`  PlatformFeeSchedule:          ${report.platformFeeSchedule}`);
  console.log(`  PlatformFeeChange:            ${report.platformFeeChange}`);
  console.log(`  CommissionRateChange:         ${report.commissionRateChange}`);
  console.log(`  AdminAuditLog:                ${report.adminAuditLog}`);
  console.log(`  User.referredById gỡ về null: ${report.referredByNulled}`);
  line();
  console.log(`\nĐã xoá ${report.user} tài khoản (đúng bằng purgeUsers.length=${purgeUsers.length} tính trước khi transaction).`);
  console.log("Category và mọi bảng cấu hình hệ thống (CommissionSetting/PlatformFeeSetting/SellerLevelConfig/SellerLevelSetting/PaymentConfig/SiteConfig/HomeBanner/AuctionSetting/SepayUnmatchedTransaction) KHÔNG bị đụng tới.");
}

main()
  .catch((err) => {
    console.error("\n❌ LỖI — transaction đã ROLLBACK TOÀN BỘ (nếu đã vào transaction), KHÔNG có gì bị xoá dở dang:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
