// Module DÙNG CHUNG bởi scripts/check-demo.mjs (dò, chỉ đọc) và
// scripts/cleanup-demo.mjs (xoá thật) — CỐ Ý tách ra 1 file để 2 script
// KHÔNG BAO GIỜ lệch nhau về "ai bị xoá / ai được giữ / cái gì là xung đột".
//
// PHẠM VI (cập nhật 2026-08-29 — CHỐT CUỐI): XOÁ TOÀN BỘ tài khoản + dữ liệu
// của họ, CHỈ GIỮ LẠI đúng 18 email trong WHITELIST_EMAILS + ĐÚNG 1 email
// admin cố định (KEEP_ADMIN_EMAIL = "admin@marketmmo.pro") + bot hệ thống
// (hạ tầng, xem SYSTEM_BOT_EMAIL) + Category + mọi bảng cấu hình hệ thống
// (không gắn userId). KHÔNG còn khái niệm "chỉ 4 seller demo" nữa — bất kỳ
// tài khoản nào KHÔNG nằm trong tập giữ đều là ứng viên xoá, kể cả @gmail
// thật khác không phải seed.
//
// QUAN TRỌNG — admin nhận diện theo EMAIL CỐ ĐỊNH, KHÔNG còn theo role=ADMIN
// nói chung: mọi tài khoản role=ADMIN KHÁC admin@marketmmo.pro (vd tài khoản
// từng được nâng quyền admin để test) đều là ỨNG VIÊN XOÁ như bình thường —
// đây là thay đổi có chủ đích theo yêu cầu người dùng (huynhthilananh99@
// gmail.com trước đó là admin+seller, giờ chuyển từ GIỮ sang XOÁ).
//
// AN TOÀN CỐT LÕI: 1 tài khoản "ứng viên xoá" CHỈ thực sự bị xoá nếu KHÔNG
// có bất kỳ record nào của nó dính (đơn hàng/review/hội thoại/giới thiệu/hoa
// hồng) tới 1 trong 18 email whitelist hoặc admin — nếu có, tài khoản đó (và
// TOÀN BỘ dữ liệu của nó, kể cả sản phẩm/đơn hàng sạch khác) được BỎ QUA
// HOÀN TOÀN, liệt kê ra cho người dùng tự quyết, KHÔNG xoá gì của họ. Xem
// identifyPurgeScope() để biết đầy đủ các loại xung đột được rà.

export const WHITELIST_EMAILS = new Set(
  [
    "haisson89@gmail.com",
    "alidabet87@gmail.com",
    "heydo123@gmail.com",
    "meouditimchuotnhat54@gmail.com",
    "aiditimai874@gmail.com",
    "nguyenhoa548@gmail.com",
    "lannguyenthi547@gmail.com",
    "hoathitran547@gmail.com",
    "tuannguyen547@gmail.com",
    "thuthanhnuyen475@gmail.com",
    "tuanvantran87@gmail.com",
    "quangnguyen54@gmail.com",
    "hoanguyenthi74@gmail.com",
    "anhnguyenthi78@gmail.com",
    "linhvanthi54@gmail.com",
    "hatranvan547@gmail.com",
    "hongnnguyenthi74@gmail.com",
    "longvantran748@gmail.com",
  ].map((e) => e.toLowerCase().trim())
);

// Bot hệ thống (src/lib/system-bot.ts) — HẠ TẦNG, luôn giữ, không tính vào
// "18 whitelist + admin" nhưng cũng KHÔNG BAO GIỜ nằm trong tập bị xoá.
export const SYSTEM_BOT_EMAIL = "system@marketmmo.internal";

// Email admin DUY NHẤT được giữ — chốt theo yêu cầu người dùng 2026-08-29.
// Bất kỳ tài khoản role=ADMIN nào KHÁC email này đều bị coi là ứng viên xoá.
export const KEEP_ADMIN_EMAIL = "admin@marketmmo.pro";

export function normEmail(e) {
  return (e ?? "").toLowerCase().trim();
}

export function maskDatabaseUrl(raw) {
  if (!raw) return "(DATABASE_URL không có giá trị)";
  try {
    const url = new URL(raw);
    const db = url.pathname.replace(/^\//, "");
    return `host=${url.hostname} | port=${url.port || "(mặc định)"} | database=${db} | user=${url.username || "?"}`;
  } catch {
    return "(DATABASE_URL không parse được dạng URL chuẩn)";
  }
}

/**
 * Phân tách TOÀN BỘ user trong DB thành:
 *   - keepUsers: khớp 1 trong 18 whitelist HOẶC đúng email KEEP_ADMIN_EMAIL
 *     HOẶC bot hệ thống.
 *   - candidateDeleteUsers: mọi user còn lại (ứng viên xoá — CHƯA chắc xoá,
 *     còn phải qua rà xung đột bên dưới). Bao gồm CẢ tài khoản role=ADMIN
 *     khác KEEP_ADMIN_EMAIL (vd tài khoản test từng được nâng quyền admin).
 *
 * Rồi rà 6 loại xung đột (bất kỳ record nào của 1 candidate-delete-user dính
 * tới 1 keep-user) — bất kỳ candidate nào dính XUNG ĐỘT được chuyển sang
 * `protectedUserIds` (KHÔNG xoá gì của họ, kể cả sản phẩm/đơn hàng sạch
 * khác). Phần còn lại (`purgeUsers` = candidateDeleteUsers trừ
 * protectedUserIds) là tập AN TOÀN TUYỆT ĐỐI để xoá — dùng bởi
 * cleanup-demo.mjs.
 */
export async function identifyPurgeScope(prisma) {
  const allUsers = await prisma.user.findMany({ include: { seller: true } });

  const keepUsers = [];
  const candidateDeleteUsers = [];
  const matchedWhitelistEmails = new Set();
  const adminUsers = []; // MỌI tài khoản role=ADMIN (kể cả những cái sẽ BỊ XOÁ)
  let keepAdminUser = null;
  const otherAdminsBeingDeleted = []; // role=ADMIN nhưng KHÁC KEEP_ADMIN_EMAIL
  // Tách riêng "keepUsers" (KHÔNG BAO GIỜ xoá — gồm cả bot hạ tầng) khỏi
  // "protectionTriggerUsers" (chỉ 18 whitelist + KEEP_ADMIN_EMAIL — DÙNG ĐỂ
  // RÀ XUNG ĐỘT). Bot hệ thống (src/lib/system-bot.ts) tự động nhắn tin chào
  // mừng MỌI tài khoản mới đăng ký — nếu tính bot vào tập kích hoạt xung đột,
  // GẦN NHƯ MỌI tài khoản (kể cả @gmail rác không liên quan) sẽ bị coi là
  // "dính whitelist" chỉ vì từng nhận tin chào mừng, làm sai lệch hoàn toàn
  // phạm vi xoá.
  const protectionTriggerUsers = [];

  for (const u of allUsers) {
    const email = normEmail(u.email);
    const isWhitelisted = WHITELIST_EMAILS.has(email);
    const isKeepAdmin = email === KEEP_ADMIN_EMAIL;
    const isSystemBot = email === SYSTEM_BOT_EMAIL;
    if (isWhitelisted) matchedWhitelistEmails.add(email);
    if (u.role === "ADMIN") {
      adminUsers.push(u);
      if (isKeepAdmin) keepAdminUser = u;
      else otherAdminsBeingDeleted.push(u);
    }
    if (isWhitelisted || isKeepAdmin || isSystemBot) keepUsers.push(u);
    else candidateDeleteUsers.push(u);
    if (isWhitelisted || isKeepAdmin) protectionTriggerUsers.push(u);
  }

  const missingWhitelistEmails = [...WHITELIST_EMAILS].filter((e) => !matchedWhitelistEmails.has(e));

  const keepUserIds = new Set(keepUsers.map((u) => u.id));
  const keepSellerIds = new Set(keepUsers.filter((u) => u.seller).map((u) => u.seller.id));
  const candidateDeleteUserIds = new Set(candidateDeleteUsers.map((u) => u.id));

  // CHỈ 18 whitelist + admin — dùng để RÀ XUNG ĐỘT (bot hạ tầng cố tình
  // KHÔNG nằm trong tập này, xem giải thích ở protectionTriggerUsers trên).
  const protectionTriggerUserIds = new Set(protectionTriggerUsers.map((u) => u.id));
  const protectionTriggerSellerIds = new Set(protectionTriggerUsers.filter((u) => u.seller).map((u) => u.seller.id));
  // PHƯƠNG ÁN B (2026-08-29): CHỈ 18 whitelist — dùng RIÊNG cho pass Conversation
  // (mục 5 bên dưới). Hội thoại/tin nhắn TEST giữa 1 tài khoản-xoá và ADMIN
  // KHÔNG còn được coi là xung đột chặn (được phép xoá kèm để gỡ Restrict FK)
  // — chỉ hội thoại với 1 trong 18 WHITELIST mới còn chặn. Quyết định có chủ
  // ý theo yêu cầu người dùng, KHÔNG áp dụng cho các pass khác (Order/Review/
  // Referral/referredBy/bảng cấu hình admin vẫn coi admin là keep như cũ).
  const whitelistOnlyUserIds = new Set(keepUsers.filter((u) => WHITELIST_EMAILS.has(normEmail(u.email))).map((u) => u.id));
  // sellerId -> ownerUserId, chỉ cho ứng viên xoá có gian hàng.
  const candidateSellerOwner = new Map(
    candidateDeleteUsers.filter((u) => u.seller).map((u) => [u.seller.id, u.id])
  );

  // protectedUserIds: candidate-delete-user nào bị BẢO VỆ (không xoá gì của
  // họ) vì có record dính tới 1 keep-user. Map userId -> reason[] (mỗi lý do
  // kèm record cụ thể để liệt kê cho người dùng).
  const protectedUserIds = new Map();
  function protect(userId, reason) {
    if (!userId || !candidateDeleteUserIds.has(userId)) return;
    if (!protectedUserIds.has(userId)) protectedUserIds.set(userId, []);
    protectedUserIds.get(userId).push(reason);
  }

  const conflicts = {
    orderCrossKeepSeller: [], // buyer=keep mua từ seller=candidate-xoá
    orderCrossKeepBuyer: [], // buyer=candidate-xoá mua từ seller=keep
    reviewCrossKeepReviewer: [], // review của keep-user cho seller=candidate-xoá (chặn)
    reviewCrossKeepSellerInfo: [], // review của candidate-xoá cho seller=keep (chỉ thông tin)
    referralCross: [], // ReferralCommission nối keep <-> candidate-xoá
    referredByCross: [], // keep-user.referredById trỏ vào candidate-xoá
    conversationCross: [], // Conversation giữa keep-user và candidate-xoá (khác bot)
    adminTableCross: [], // candidate-xoá từng là adminId/createdBy/changedBy ở bảng cấu hình (hiếm)
    forumCross: [], // bình luận/thích/báo cáo của keep-user trên bài forum của candidate-xoá
  };

  // ---- 1) OrderItem: buyer/seller cắt ngang biên keep/xoá ----
  const allOrderItems = await prisma.orderItem.findMany({
    select: {
      id: true,
      orderId: true,
      sellerId: true,
      productName: true,
      price: true,
      quantity: true,
      order: { select: { id: true, orderCode: true, buyerId: true, buyer: { select: { email: true } } } },
    },
  });
  for (const item of allOrderItems) {
    const buyerId = item.order.buyerId;
    const buyerIsKeep = protectionTriggerUserIds.has(buyerId);
    const buyerIsCandidate = candidateDeleteUserIds.has(buyerId);
    const sellerIsKeep = protectionTriggerSellerIds.has(item.sellerId);
    const sellerOwnerCandidateId = candidateSellerOwner.get(item.sellerId);

    if (buyerIsKeep && sellerOwnerCandidateId) {
      protect(sellerOwnerCandidateId, `Bán cho whitelist ${item.order.buyer.email} — orderItemId=${item.id} orderCode=${item.order.orderCode} sản phẩm="${item.productName}"`);
      conflicts.orderCrossKeepSeller.push({ ...item, sellerOwnerCandidateId });
    }
    if (buyerIsCandidate && sellerIsKeep) {
      protect(buyerId, `Mua từ seller thuộc whitelist/admin — orderItemId=${item.id} orderCode=${item.order.orderCode} sản phẩm="${item.productName}"`);
      conflicts.orderCrossKeepBuyer.push({ ...item, buyerId });
    }
  }

  // ---- 2) Review: reviewer/seller cắt ngang biên ----
  const allReviews = await prisma.review.findMany({
    select: {
      id: true,
      rating: true,
      comment: true,
      sellerId: true,
      userId: true,
      user: { select: { email: true } },
      seller: { select: { userId: true, shopName: true } },
    },
  });
  for (const r of allReviews) {
    const reviewerIsKeep = protectionTriggerUserIds.has(r.userId);
    const reviewerCandidateId = candidateDeleteUserIds.has(r.userId) ? r.userId : null;
    const sellerOwnerCandidateId = candidateSellerOwner.get(r.sellerId);
    const sellerOwnerIsKeep = protectionTriggerUserIds.has(r.seller.userId);

    if (reviewerIsKeep && sellerOwnerCandidateId) {
      // Xoá seller này sẽ CASCADE xoá luôn review do whitelist viết — chặn.
      protect(sellerOwnerCandidateId, `Nhận review từ whitelist ${r.user.email} — reviewId=${r.id} rating=${r.rating}`);
      conflicts.reviewCrossKeepReviewer.push(r);
    }
    if (reviewerCandidateId && sellerOwnerIsKeep) {
      // Chỉ thông tin — xoá user này sẽ cascade xoá review của họ cho seller
      // whitelist (giảm 1 review/rating hiển thị của seller đó), nhưng KHÔNG
      // đụng gì thuộc sở hữu whitelist trực tiếp — không chặn.
      conflicts.reviewCrossKeepSellerInfo.push(r);
    }
  }

  // ---- 3) ReferralCommission: referrer/referredUser cắt ngang biên ----
  const allReferrals = await prisma.referralCommission.findMany({
    select: {
      id: true,
      status: true,
      commissionAmount: true,
      referrerId: true,
      referredUserId: true,
      referrer: { select: { email: true } },
      referredUser: { select: { email: true } },
    },
  });
  for (const r of allReferrals) {
    const referrerIsKeep = protectionTriggerUserIds.has(r.referrerId);
    const referredIsKeep = protectionTriggerUserIds.has(r.referredUserId);
    const referrerIsCandidate = candidateDeleteUserIds.has(r.referrerId);
    const referredIsCandidate = candidateDeleteUserIds.has(r.referredUserId);
    if (referrerIsKeep && referredIsCandidate) {
      protect(r.referredUserId, `ReferralCommission với whitelist ${r.referrer.email} làm người giới thiệu — id=${r.id} status=${r.status}`);
      conflicts.referralCross.push(r);
    }
    if (referredIsKeep && referrerIsCandidate) {
      protect(r.referrerId, `ReferralCommission với whitelist ${r.referredUser.email} là người được giới thiệu — id=${r.id} status=${r.status}`);
      conflicts.referralCross.push(r);
    }
  }

  // ---- 4) User.referredById: whitelist/admin được giới thiệu BỞI candidate-xoá ----
  for (const u of protectionTriggerUsers) {
    if (u.referredById && candidateDeleteUserIds.has(u.referredById)) {
      protect(u.referredById, `Là người giới thiệu (referredById) của whitelist/admin ${u.email}`);
      conflicts.referredByCross.push({ keepUserEmail: u.email, referredById: u.referredById });
    }
  }

  // ---- 5) Conversation: 1 bên WHITELIST (18 email — KHÔNG tính admin, xem
  //      PHƯƠNG ÁN B ở whitelistOnlyUserIds trên), 1 bên candidate-xoá. CỐ Ý
  //      loại trừ bot hệ thống — bot tự nhắn chào mừng MỌI tài khoản mới nên
  //      không thể coi là tín hiệu "dính whitelist". Hội thoại với ADMIN
  //      KHÔNG còn chặn xoá (cho phép xoá kèm conversation/message đó khi xoá
  //      account để gỡ Restrict FK — xem cleanup-demo.mjs). ----
  const allConversations = await prisma.conversation.findMany({
    select: {
      id: true,
      userAId: true,
      userBId: true,
      userA: { select: { email: true } },
      userB: { select: { email: true } },
      _count: { select: { messages: true } },
    },
  });
  for (const c of allConversations) {
    const aIsWhitelist = whitelistOnlyUserIds.has(c.userAId);
    const bIsWhitelist = whitelistOnlyUserIds.has(c.userBId);
    const aIsCandidate = candidateDeleteUserIds.has(c.userAId);
    const bIsCandidate = candidateDeleteUserIds.has(c.userBId);
    if (aIsWhitelist && bIsCandidate) {
      protect(c.userBId, `Hội thoại với whitelist ${c.userA.email} — conversationId=${c.id}, ${c._count.messages} tin nhắn`);
      conflicts.conversationCross.push(c);
    }
    if (bIsWhitelist && aIsCandidate) {
      protect(c.userAId, `Hội thoại với whitelist ${c.userB.email} — conversationId=${c.id}, ${c._count.messages} tin nhắn`);
      conflicts.conversationCross.push(c);
    }
  }

  // ---- 6) Bảng cấu hình chỉ admin thao tác — GIỜ có ý nghĩa THẬT (không chỉ
  //      phòng thủ nữa): candidate-xoá có thể là admin ĐANG HOẠT ĐỘNG (vd
  //      huynhthilananh99@gmail.com) — 4 field createdById/changedById/
  //      adminId là String BẮT BUỘC (không nullable) với Restrict FK, nên
  //      KHÔNG THỂ SetNull. Đây KHÔNG phải "xung đột với whitelist" (không
  //      đụng dữ liệu SỞ HỮU của 18 whitelist/admin — chỉ là 1 dòng nhật ký
  //      admin ghi "ai đổi gì lúc nào", targetId chỉ là chuỗi rời rạc, không
  //      phải khoá ngoại thật tới dữ liệu whitelist) — nên KHÔNG protect().
  //      cleanup-demo.mjs sẽ XOÁ các dòng này TRƯỚC KHI xoá User admin cũ,
  //      liệt kê ở đây chỉ để BÁO TRƯỚC cho người dùng biết.
  const candidateIdsArr = [...candidateDeleteUserIds];
  const [feeSchedules, feeChanges, commissionChanges, auditLogs] = await Promise.all([
    prisma.platformFeeSchedule.findMany({ where: { createdById: { in: candidateIdsArr } }, select: { id: true, createdById: true } }),
    prisma.platformFeeChange.findMany({ where: { changedById: { in: candidateIdsArr } }, select: { id: true, changedById: true } }),
    prisma.commissionRateChange.findMany({ where: { changedById: { in: candidateIdsArr } }, select: { id: true, changedById: true } }),
    prisma.adminAuditLog.findMany({ where: { adminId: { in: candidateIdsArr } }, select: { id: true, adminId: true } }),
  ]);
  for (const row of feeSchedules) conflicts.adminTableCross.push({ table: "PlatformFeeSchedule", ...row });
  for (const row of feeChanges) conflicts.adminTableCross.push({ table: "PlatformFeeChange", ...row });
  for (const row of commissionChanges) conflicts.adminTableCross.push({ table: "CommissionRateChange", ...row });
  for (const row of auditLogs) conflicts.adminTableCross.push({ table: "AdminAuditLog", ...row });

  // ---- 7) ForumPost: tác giả là candidate-xoá, nhưng có bình luận/thích/báo
  //      cáo từ 1 trong 18 whitelist/admin trên bài đó — ForumPost.author là
  //      onDelete: Cascade nên xoá tác giả sẽ CASCADE xoá cả bài, kéo theo
  //      CASCADE xoá luôn bình luận/thích/báo cáo của whitelist/admin trên
  //      bài đó (dữ liệu do CHÍNH whitelist/admin tạo ra) — chặn. Dùng
  //      protectionTriggerUserIds (whitelist + admin), KHÔNG nới lỏng như
  //      Conversation — người dùng chỉ yêu cầu nới lỏng riêng phần hội thoại.
  const candidatePosts = await prisma.forumPost.findMany({
    where: { authorId: { in: candidateIdsArr } },
    select: { id: true, title: true, authorId: true },
  });
  const candidatePostIds = candidatePosts.map((p) => p.id);
  const postById = new Map(candidatePosts.map((p) => [p.id, p]));
  const protectionTriggerIdsArr = [...protectionTriggerUserIds];
  if (candidatePostIds.length && protectionTriggerIdsArr.length) {
    const [keepComments, keepLikes, keepReports] = await Promise.all([
      prisma.forumComment.findMany({
        where: { postId: { in: candidatePostIds }, authorId: { in: protectionTriggerIdsArr } },
        select: { id: true, postId: true, author: { select: { email: true } } },
      }),
      prisma.forumLike.findMany({
        where: { postId: { in: candidatePostIds }, userId: { in: protectionTriggerIdsArr } },
        select: { id: true, postId: true, user: { select: { email: true } } },
      }),
      prisma.forumReport.findMany({
        where: { postId: { in: candidatePostIds }, reporterId: { in: protectionTriggerIdsArr } },
        select: { id: true, postId: true, reporter: { select: { email: true } } },
      }),
    ]);
    for (const c of keepComments) {
      const post = postById.get(c.postId);
      protect(post.authorId, `Bài forum "${post.title}" có bình luận từ whitelist/admin ${c.author.email} — commentId=${c.id} (Cascade khi xoá tác giả bài)`);
      conflicts.forumCross.push({ type: "comment", postTitle: post.title, ...c });
    }
    for (const l of keepLikes) {
      const post = postById.get(l.postId);
      protect(post.authorId, `Bài forum "${post.title}" có lượt thích từ whitelist/admin ${l.user.email} — likeId=${l.id} (Cascade khi xoá tác giả bài)`);
      conflicts.forumCross.push({ type: "like", postTitle: post.title, ...l });
    }
    for (const r of keepReports) {
      const post = postById.get(r.postId);
      protect(post.authorId, `Bài forum "${post.title}" có báo cáo từ whitelist/admin ${r.reporter.email} — reportId=${r.id} (Cascade khi xoá tác giả bài)`);
      conflicts.forumCross.push({ type: "report", postTitle: post.title, ...r });
    }
  }

  // ---- Tổng hợp tập AN TOÀN TUYỆT ĐỐI để xoá ----
  const purgeUsers = candidateDeleteUsers.filter((u) => !protectedUserIds.has(u.id));
  const purgeUserIds = purgeUsers.map((u) => u.id);
  const purgeSellerIds = purgeUsers.filter((u) => u.seller).map((u) => u.seller.id);

  const protectedUsers = candidateDeleteUsers.filter((u) => protectedUserIds.has(u.id));

  return {
    allUsers,
    keepUsers,
    adminUsers, // MỌI role=ADMIN, kể cả những cái sẽ bị xoá
    keepAdminUser, // đúng 1 user khớp KEEP_ADMIN_EMAIL (null nếu không tồn tại)
    otherAdminsBeingDeleted, // role=ADMIN khác KEEP_ADMIN_EMAIL — ứng viên xoá
    matchedWhitelistEmails,
    missingWhitelistEmails,
    candidateDeleteUsers,
    protectedUsers,
    protectedUserIds, // Map<userId, reason[]>
    purgeUsers,
    purgeUserIds,
    purgeSellerIds,
    whitelistOnlyUserIds,
    keepUserIds,
    keepSellerIds,
    conflicts,
  };
}
