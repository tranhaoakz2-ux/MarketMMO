import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AUCTION_SETTING_ID,
  DEFAULT_AUCTION_FLOOR_PRICE,
  DEFAULT_AUCTION_SLOT_COUNT,
} from "@/lib/constants";
import { getAuctionWindowFor, getNextWindowStart, isWithinAuctionWindow } from "@/lib/auction-schedule";

type Db = PrismaClient | Prisma.TransactionClient;

// Cấu hình đấu giá vị trí vàng singleton — lazy-tạo lần đầu đọc, cùng
// pattern getPlatformFeeSetting() (src/lib/platform-fee.ts).
export async function getAuctionSetting(db: Db = prisma) {
  const existing = await db.auctionSetting.findUnique({ where: { id: AUCTION_SETTING_ID } });
  if (existing) return existing;
  return db.auctionSetting.create({
    data: {
      id: AUCTION_SETTING_ID,
      slotCount: DEFAULT_AUCTION_SLOT_COUNT,
      floorPrice: DEFAULT_AUCTION_FLOOR_PRICE,
    },
  });
}

// Đọc phiên của TUẦN CHỨA `now` — KHÔNG tạo mới (dùng cho trang hiển thị,
// tránh tạo rác dữ liệu chỉ vì có người ghé xem trang ngoài giờ đấu giá).
export async function findCurrentWeekSession(now: Date = new Date()) {
  const { windowStart } = getAuctionWindowFor(now);
  return prisma.auctionSession.findUnique({ where: { windowStart } });
}

// Lấy-hoặc-tạo phiên của tuần chứa `now` — CHỈ gọi từ luồng đặt giá (đã xác
// nhận isWithinAuctionWindow(now)=true ở nơi gọi). upsert theo windowStart
// (unique) để 2 bid đầu tiên rơi đúng lúc cùng lúc không tạo trùng phiên.
async function getOrCreateCurrentSession(now: Date) {
  const { windowStart, windowEnd } = getAuctionWindowFor(now);
  return prisma.auctionSession.upsert({
    where: { windowStart },
    create: { windowStart, windowEnd, status: "OPEN" },
    update: {},
  });
}

type ExistingBid = {
  id: string;
  amount: number;
  status: string;
  holdTransactionId: string | null;
};

// Đặt giá LẦN ĐẦU của 1 seller trong 1 phiên — khoá tiền NGAY (vá "ghost
// bid" của hệ cũ, hệ cũ hoàn toàn không khoá gì lúc đặt giá). Trừ ví NGUYÊN
// TỬ có điều kiện (updateMany + walletBalance gte, đúng khuôn mẫu
// deductWalletOrThrow() của hệ thống rút tiền) rồi mới tạo bid — nếu 2 bid
// ĐẦU TIÊN của cùng 1 seller/phiên race nhau, @@unique([sessionId, sellerId])
// sẽ làm 1 trong 2 lệnh INSERT bid thất bại (P2002) → Prisma tự ROLLBACK
// toàn bộ $transaction đó (kể cả bước trừ ví đã chạy trước) — không mất tiền.
async function placeNewBid(params: {
  sessionId: string;
  sellerId: string;
  productId: string;
  userId: string;
  amount: number;
}) {
  try {
    return await prisma.$transaction(async (t) => {
      const dec = await t.user.updateMany({
        where: { id: params.userId, walletBalance: { gte: params.amount } },
        data: { walletBalance: { decrement: params.amount } },
      });
      if (dec.count === 0) throw new Error("Số dư ví không đủ để đặt giá đấu này.");

      const holdTx = await t.walletTransaction.create({
        data: {
          userId: params.userId,
          type: "AUCTION_HOLD",
          amount: -params.amount,
          status: "PENDING",
          note: "Khoá tiền đặt giá đấu vị trí vàng",
        },
      });

      const bid = await t.auctionBid.create({
        data: {
          sessionId: params.sessionId,
          sellerId: params.sellerId,
          productId: params.productId,
          amount: params.amount,
          status: "ACTIVE",
          holdTransactionId: holdTx.id,
        },
      });

      await t.walletTransaction.update({
        where: { id: holdTx.id },
        data: { auctionBidId: bid.id },
      });

      return bid;
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      throw new Error("Bạn đã có 1 lượt đặt giá đang hoạt động cho phiên này — hãy tải lại trang và nâng giá thay vì đặt mới.");
    }
    throw err;
  }
}

// Nâng giá bid ĐANG ACTIVE — 1 $transaction vừa hoàn khoá cũ (WalletTransaction
// cũ PENDING→REJECTED có điều kiện, cộng lại ví) vừa khoá mức mới (trừ ví
// nguyên tử, tạo WalletTransaction mới), rồi CẬP NHẬT cùng dòng AuctionBid
// (không tạo dòng mới). Gate optimistic-concurrency bằng holdTransactionId
// CŨ khi update bid — 2 request nâng giá cùng lúc từ cùng seller, request
// thua sẽ thấy count=0 ở bước cuối và toàn bộ transaction ROLLBACK (không
// mất tiền, không double-lock).
async function raiseBid(params: {
  bid: ExistingBid;
  productId: string;
  userId: string;
  newAmount: number;
}) {
  if (params.newAmount <= params.bid.amount) {
    throw new Error("Giá đấu mới phải cao hơn giá đang đặt hiện tại.");
  }
  if (!params.bid.holdTransactionId) {
    throw new Error("Không tìm thấy khoản tiền đang khoá cho lượt đặt giá này — hãy tải lại trang.");
  }

  return prisma.$transaction(async (t) => {
    const releaseOld = await t.walletTransaction.updateMany({
      where: { id: params.bid.holdTransactionId!, status: "PENDING" },
      data: { status: "REJECTED", confirmedAt: new Date() },
    });
    if (releaseOld.count === 0) {
      throw new Error("Lượt đặt giá này vừa được xử lý ở nơi khác — hãy tải lại trang.");
    }
    await t.user.update({
      where: { id: params.userId },
      data: { walletBalance: { increment: params.bid.amount } },
    });

    const dec = await t.user.updateMany({
      where: { id: params.userId, walletBalance: { gte: params.newAmount } },
      data: { walletBalance: { decrement: params.newAmount } },
    });
    if (dec.count === 0) throw new Error("Số dư ví không đủ để nâng giá đấu này.");

    const newHoldTx = await t.walletTransaction.create({
      data: {
        userId: params.userId,
        type: "AUCTION_HOLD",
        amount: -params.newAmount,
        status: "PENDING",
        note: "Khoá tiền đặt giá đấu vị trí vàng (nâng giá)",
        auctionBidId: params.bid.id,
      },
    });

    const updated = await t.auctionBid.updateMany({
      where: { id: params.bid.id, holdTransactionId: params.bid.holdTransactionId, status: "ACTIVE" },
      data: { amount: params.newAmount, productId: params.productId, holdTransactionId: newHoldTx.id },
    });
    if (updated.count === 0) {
      throw new Error("Lượt đặt giá này vừa được cập nhật ở nơi khác — hãy tải lại trang.");
    }

    return t.auctionBid.findUniqueOrThrow({ where: { id: params.bid.id } });
  });
}

// Đặt/nâng giá — điểm vào DUY NHẤT dùng ở POST /api/auction/bids. Tự phân
// biệt "đặt lần đầu" (chưa có bid ACTIVE nào của seller trong phiên) hay
// "nâng giá" (đã có).
export async function placeOrRaiseBid(params: {
  sessionId: string;
  sellerId: string;
  productId: string;
  userId: string;
  amount: number;
}) {
  const existing = await prisma.auctionBid.findUnique({
    where: { sessionId_sellerId: { sessionId: params.sessionId, sellerId: params.sellerId } },
  });

  if (!existing) {
    return { bid: await placeNewBid(params), raised: false };
  }
  if (existing.status !== "ACTIVE") {
    throw new Error("Lượt đặt giá trước của bạn trong phiên này đã được xử lý, không thể sửa nữa.");
  }
  const bid = await raiseBid({ bid: existing, productId: params.productId, userId: params.userId, newAmount: params.amount });
  return { bid, raised: true };
}

// Xác thực khung giờ + lấy/tạo phiên hiện tại — bọc chung logic dùng ở route
// đặt giá, tách riêng khỏi placeOrRaiseBid() để route có thể trả lỗi rõ ràng
// "ngoài giờ đấu giá" trước khi chạm tới bất kỳ thao tác tiền nào.
export async function requireOpenSessionForBidding(now: Date = new Date()) {
  if (!isWithinAuctionWindow(now)) {
    throw new Error("Ngoài giờ đấu giá — phiên chỉ nhận đặt giá từ 20:00 đến 22:00 tối Chủ Nhật hàng tuần.");
  }
  const session = await getOrCreateCurrentSession(now);
  if (session.status !== "OPEN") {
    throw new Error("Phiên đấu giá này đã đóng.");
  }
  return session;
}

// Đóng session PENDING_REVIEW → CLOSED khi không còn bid nào chờ duyệt (mọi
// vị trí Top N đã được admin duyệt/từ chối hết) — chỉ mang tính bookkeeping
// cho UI admin, KHÔNG phải điều kiện an toàn tiền (điều kiện tiền luôn là
// gate atomic trên chính dòng WalletTransaction/AuctionBid).
async function maybeCloseSessionIfDone(t: Prisma.TransactionClient, sessionId: string) {
  const remaining = await t.auctionBid.count({ where: { sessionId, status: "PENDING_APPROVAL" } });
  if (remaining === 0) {
    await t.auctionSession.updateMany({
      where: { id: sessionId, status: "PENDING_REVIEW" },
      data: { status: "CLOSED" },
    });
  }
}

// CHỐT 1 PHIÊN — bước tự động chạy lúc phiên đã qua windowEnd (cron hoặc
// admin bấm tay "Chốt phiên"): xếp hạng mọi bid ACTIVE giảm dần theo amount
// (đồng giá thì ai đặt trước xếp trên), Top N (N đọc từ AuctionSetting NGAY
// LÚC NÀY, đóng băng vào AuctionSession.slotCount) → PENDING_APPROVAL (tiền
// VẪN khoá), phần còn lại → LOST + tự động hoàn tiền ngay.
//
// TOÀN BỘ nằm trong 1 $transaction: bước gate đầu tiên (OPEN→PENDING_REVIEW,
// điều kiện status="OPEN") vừa là điểm CHỐNG CHỐT TRÙNG (double-run cron +
// admin bấm tay cùng lúc, hoặc cron chạy 2 lần) — Postgres tự khoá đúng 1
// dòng AuctionSession này cho tới khi transaction đầu tiên commit/rollback,
// transaction đến sau đọc lại thấy status đã đổi nên count=0, tự return
// {closed:false} mà không đụng gì thêm. Nếu quá trình lỗi giữa chừng (crash
// server...), toàn bộ transaction rollback về đúng trạng thái OPEN ban đầu —
// lần chạy sau tự làm lại từ đầu, không có bid nào bị "treo" nửa vời.
//
// Rủi ro còn lại (chấp nhận được, không xử lý riêng): 1 bid đặt ĐÚNG lúc
// giao thoa vài chục mili-giây quanh 22:00:00 (vừa qua kiểm tra
// isWithinAuctionWindow lúc 21:59:59.9 nhưng transaction hoàn tất sau khi
// closeAuctionSession() đã đọc xong danh sách bid ACTIVE) về lý thuyết có
// thể bị bỏ sót khỏi lượt chốt này. Cực hiếm (cần đúng 1 request đặt giá +
// 1 lượt chốt trùng khớp trong cửa sổ mili-giây quanh đúng 22:00:00) và
// closeAuctionSession() chỉ được kích hoạt cho phiên đã windowEnd<=now (tức
// LUÔN sau 22:00), không có khoảng thời gian nào bid hợp lệ (giờ còn mở) và
// chốt phiên diễn ra đồng thời trên diện rộng.
export async function closeAuctionSession(sessionId: string): Promise<{
  closed: boolean;
  topCount: number;
  refundedCount: number;
}> {
  const setting = await getAuctionSetting();

  return prisma.$transaction(
    async (t) => {
      const gate = await t.auctionSession.updateMany({
        where: { id: sessionId, status: "OPEN" },
        data: { status: "PENDING_REVIEW", slotCount: setting.slotCount, closedAt: new Date() },
      });
      if (gate.count === 0) {
        return { closed: false, topCount: 0, refundedCount: 0 };
      }

      const bids = await t.auctionBid.findMany({
        where: { sessionId, status: "ACTIVE" },
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        include: { seller: { select: { userId: true } } },
      });

      const n = setting.slotCount;
      const topN = bids.slice(0, n);
      const rest = bids.slice(n);

      for (const [index, bid] of topN.entries()) {
        await t.auctionBid.update({
          where: { id: bid.id },
          data: { status: "PENDING_APPROVAL", rank: index + 1 },
        });
      }

      let refundedCount = 0;
      for (const bid of rest) {
        if (bid.holdTransactionId) {
          await t.walletTransaction.update({
            where: { id: bid.holdTransactionId },
            data: { status: "REJECTED", confirmedAt: new Date() },
          });
          await t.user.update({
            where: { id: bid.seller.userId },
            data: { walletBalance: { increment: bid.amount } },
          });
        }
        await t.auctionBid.update({ where: { id: bid.id }, data: { status: "LOST" } });
        refundedCount++;
      }

      // Không có bid nào lọt Top N (vd 0 bid tổng) — không có gì chờ duyệt,
      // đóng phiên luôn thay vì treo ở PENDING_REVIEW vô thời hạn.
      if (topN.length === 0) {
        await t.auctionSession.update({ where: { id: sessionId }, data: { status: "CLOSED" } });
      }

      return { closed: true, topCount: topN.length, refundedCount };
    },
    { timeout: 20000 }
  );
}

// Quét + chốt MỌI phiên đã qua windowEnd nhưng còn OPEN — dùng chung cho cả
// POST /api/cron/daily (tự động) và nút admin "Chốt phiên" (bấm tay khi cần,
// vd test hoặc cron chưa kịp chạy) — không viết trùng logic 2 nơi.
export async function closeDueAuctionSessions(now: Date = new Date()): Promise<{ sessionsClosed: number }> {
  const due = await prisma.auctionSession.findMany({
    where: { status: "OPEN", windowEnd: { lte: now } },
    select: { id: true },
  });
  let sessionsClosed = 0;
  for (const s of due) {
    const result = await closeAuctionSession(s.id);
    if (result.closed) sessionsClosed++;
  }
  return { sessionsClosed };
}

// ADMIN DUYỆT 1 vị trí Top N — WalletTransaction đang khoá (PENDING) CHUYỂN
// THẲNG thành thanh toán thật (type→"PURCHASE", status→CONFIRMED) — KHÔNG
// trừ ví thêm lần nào nữa vì tiền đã trừ từ lúc khoá (đặt/nâng giá). Set
// Product.featuredUntil = thời điểm bắt đầu phiên Chủ Nhật KẾ TIẾP (đóng
// băng theo TUẦN của phiên, không phụ thuộc admin bấm duyệt lúc nào) → sản
// phẩm lên vị trí vàng đúng 1 tuần.
export async function approveAuctionBid(bidId: string, adminId: string): Promise<{ ok: boolean }> {
  return prisma.$transaction(async (t) => {
    const bid = await t.auctionBid.findUnique({ where: { id: bidId } });
    if (!bid || bid.status !== "PENDING_APPROVAL") {
      throw new Error("Lượt đặt giá này không ở trạng thái chờ duyệt.");
    }

    const gate = await t.auctionBid.updateMany({
      where: { id: bidId, status: "PENDING_APPROVAL" },
      data: { status: "WON", decidedAt: new Date(), decidedById: adminId },
    });
    if (gate.count === 0) throw new Error("Lượt đặt giá này đã được xử lý.");

    if (bid.holdTransactionId) {
      const gateTx = await t.walletTransaction.updateMany({
        where: { id: bid.holdTransactionId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          type: "PURCHASE",
          note: `Thắng đấu giá vị trí vàng #${bid.rank ?? "?"}`,
          confirmedAt: new Date(),
        },
      });
      if (gateTx.count === 0) throw new Error("Giao dịch khoá tiền của lượt đặt giá này đã được xử lý.");
    }

    const session = await t.auctionSession.findUniqueOrThrow({ where: { id: bid.sessionId } });
    const nextWindowStart = getNextWindowStart(session.windowStart);
    await t.product.update({ where: { id: bid.productId }, data: { featuredUntil: nextWindowStart } });

    await maybeCloseSessionIfDone(t, bid.sessionId);
    return { ok: true };
  });
}

// ADMIN TỪ CHỐI 1 vị trí Top N — hoàn tiền khoá, vị trí để TRỐNG (không tự
// đôn runner-up — người kế tiếp đã được hoàn tiền lúc chốt phiên, đôn lại sẽ
// phải khoá tiền lần 2 mà không chắc họ còn đủ số dư, giữ đơn giản theo yêu
// cầu).
export async function rejectAuctionBid(
  bidId: string,
  adminId: string,
  adminNote?: string | null
): Promise<{ ok: boolean }> {
  return prisma.$transaction(async (t) => {
    const bid = await t.auctionBid.findUnique({
      where: { id: bidId },
      include: { seller: { select: { userId: true } } },
    });
    if (!bid || bid.status !== "PENDING_APPROVAL") {
      throw new Error("Lượt đặt giá này không ở trạng thái chờ duyệt.");
    }

    const gate = await t.auctionBid.updateMany({
      where: { id: bidId, status: "PENDING_APPROVAL" },
      data: { status: "REJECTED", decidedAt: new Date(), decidedById: adminId },
    });
    if (gate.count === 0) throw new Error("Lượt đặt giá này đã được xử lý.");

    if (bid.holdTransactionId) {
      const gateTx = await t.walletTransaction.updateMany({
        where: { id: bid.holdTransactionId, status: "PENDING" },
        data: { status: "REJECTED", adminNote: adminNote ?? null, confirmedAt: new Date() },
      });
      if (gateTx.count === 1) {
        await t.user.update({
          where: { id: bid.seller.userId },
          data: { walletBalance: { increment: bid.amount } },
        });
      }
    }

    await maybeCloseSessionIfDone(t, bid.sessionId);
    return { ok: true };
  });
}
