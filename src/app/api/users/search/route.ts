import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getSystemBotUser } from "@/lib/system-bot";

// Tìm tài khoản user để bắt đầu hội thoại. PHẠM VI có chủ đích để chống lạm dụng:
//  - SELLER: ai (đã đăng nhập) cũng tìm được — họ vốn công khai ở /nguoi-ban.
//  - BUYER (không phải seller): CHỈ tìm được nếu NGƯỜI TÌM đã có GIAO DỊCH CHUNG
//    với buyer đó (tức người tìm là seller và đã bán cho buyer — đơn hàng bao
//    trùm cả khiếu nại vì khiếu nại gắn 1 OrderItem). Người lạ KHÔNG dò được
//    buyer bất kỳ.
// Chỉ trả về: tên hiển thị + vai trò. TUYỆT ĐỐI không email/sđt/thông tin liên
// hệ — select Prisma chỉ lấy id/name/username (không đụng passwordHash...).
export async function GET(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const rl = rateLimit(`user-search:${userId}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Bạn tìm kiếm quá nhanh, vui lòng thử lại sau." },
      { status: 429 }
    );
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  // Tối thiểu 3 ký tự; KHÔNG có chế độ "duyệt tất cả".
  if (q.length < 3) return NextResponse.json({ users: [] });

  const bot = await getSystemBotUser();

  // Ứng viên khớp tên/username (KHÔNG khớp theo email để tránh dò email). Loại
  // chính mình + bot "Hệ Thống".
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, bot.id] },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    take: 30,
  });
  if (candidates.length === 0) return NextResponse.json({ users: [] });

  const candIds = candidates.map((c) => c.id);

  // Ai trong số ứng viên là SELLER (công khai).
  const sellers = await prisma.seller.findMany({
    where: { userId: { in: candIds } },
    select: { userId: true },
  });
  const sellerUserIds = new Set(sellers.map((s) => s.userId));

  // Buyer chỉ hiện nếu người tìm là seller đã bán cho buyer đó (giao dịch chung).
  const allowedBuyerIds = new Set<string>();
  const mySeller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
  if (mySeller) {
    const buyerCandIds = candIds.filter((id) => !sellerUserIds.has(id));
    if (buyerCandIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { buyerId: { in: buyerCandIds }, items: { some: { sellerId: mySeller.id } } },
        select: { buyerId: true },
        distinct: ["buyerId"],
      });
      for (const o of orders) allowedBuyerIds.add(o.buyerId);
    }
  }

  const users = candidates
    .filter((c) => sellerUserIds.has(c.id) || allowedBuyerIds.has(c.id))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name ?? c.username ?? `Người dùng #${c.id.slice(-6)}`,
      role: sellerUserIds.has(c.id) ? ("seller" as const) : ("buyer" as const),
    }));

  return NextResponse.json({ users });
}
