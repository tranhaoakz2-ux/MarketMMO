import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getAuctionSetting, placeOrRaiseBid, requireOpenSessionForBidding } from "@/lib/auction";

// Đặt/nâng giá đấu vị trí vàng — thay thế hoàn toàn route cũ (không khoá
// tiền, gắn theo 6 slot cố định). Mỗi seller tối đa 1 bid ACTIVE/phiên,
// nâng giá xử lý qua CÙNG route này (xem placeOrRaiseBid() trong
// src/lib/auction.ts). Tiền bị KHOÁ NGAY khỏi ví lúc gọi thành công.
export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const amount = Number(body?.amount);

  if (!productId) {
    return NextResponse.json({ error: "Thiếu thông tin sản phẩm." }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return NextResponse.json({ error: "Giá đấu không hợp lệ." }, { status: 400 });
  }

  const seller = await prisma.seller.findUnique({ where: { userId: session!.user.id } });
  if (!seller) {
    return NextResponse.json(
      { error: "Bạn cần có gian hàng để tham gia đấu giá. Hãy đăng ký bán hàng trước." },
      { status: 403 }
    );
  }
  if (seller.suspended) {
    return NextResponse.json({ error: "Gian hàng của bạn đang bị khoá, không thể tham gia đấu giá." }, { status: 403 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller.id) {
    return NextResponse.json(
      { error: "Sản phẩm không hợp lệ hoặc không thuộc gian hàng của bạn." },
      { status: 403 }
    );
  }
  // Chỉ sản phẩm ĐÃ DUYỆT mới đấu giá được — chặn ghost bid bằng sản phẩm
  // PENDING/REJECTED (thắng cũng vô nghĩa vì không hiện công khai được).
  if (product.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Chỉ đấu giá được với sản phẩm đã được duyệt công khai." },
      { status: 400 }
    );
  }

  const setting = await getAuctionSetting();
  if (amount < setting.floorPrice) {
    return NextResponse.json(
      { error: `Giá đấu phải từ ${setting.floorPrice.toLocaleString("vi-VN")}đ trở lên.` },
      { status: 400 }
    );
  }

  try {
    const activeSession = await requireOpenSessionForBidding();
    const { bid, raised } = await placeOrRaiseBid({
      sessionId: activeSession.id,
      sellerId: seller.id,
      productId,
      userId: session!.user.id,
      amount,
    });
    return NextResponse.json({ id: bid.id, amount: bid.amount, raised });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Đặt giá đấu thất bại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
