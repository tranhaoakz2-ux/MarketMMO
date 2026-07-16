import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const sellerId = typeof body?.sellerId === "string" ? body.sellerId : "";
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!sellerId) {
    return NextResponse.json({ error: "Thiếu thông tin gian hàng." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Số sao đánh giá phải từ 1 đến 5." },
      { status: 400 }
    );
  }
  if (comment.length < 5 || comment.length > 1000) {
    return NextResponse.json(
      { error: "Nội dung đánh giá phải từ 5 đến 1000 ký tự." },
      { status: 400 }
    );
  }

  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    return NextResponse.json({ error: "Không tìm thấy gian hàng." }, { status: 404 });
  }
  if (seller.userId === session!.user.id) {
    return NextResponse.json(
      { error: "Bạn không thể tự đánh giá gian hàng của mình." },
      { status: 400 }
    );
  }

  const hasPurchased = await prisma.orderItem.findFirst({
    where: { sellerId, order: { buyerId: session!.user.id } },
  });
  if (!hasPurchased) {
    return NextResponse.json(
      { error: "Bạn cần mua hàng từ gian hàng này trước khi đánh giá." },
      { status: 403 }
    );
  }

  const review = await prisma.review.upsert({
    where: { sellerId_userId: { sellerId, userId: session!.user.id } },
    update: { rating, comment },
    create: { sellerId, userId: session!.user.id, rating, comment },
  });

  return NextResponse.json({ id: review.id });
}
