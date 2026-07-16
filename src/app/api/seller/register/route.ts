import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { slugifySeller } from "@/lib/slug";
import { sendSystemMessage } from "@/lib/system-bot";

export async function POST(req: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const existing = await prisma.seller.findUnique({
    where: { userId: session!.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bạn đã có gian hàng trên MarketMMO rồi." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const shopName = typeof body?.shopName === "string" ? body.shopName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
  const facebookLink =
    typeof body?.facebookLink === "string" ? body.facebookLink.trim() || null : null;
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const agree = body?.agree === true;

  if (!shopName || shopName.length < 3) {
    return NextResponse.json(
      { error: "Tên gian hàng phải có ít nhất 3 ký tự." },
      { status: 400 }
    );
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Vui lòng nhập số điện thoại." },
      { status: 400 }
    );
  }
  if (!agree) {
    return NextResponse.json(
      { error: "Bạn cần đồng ý với Điều khoản & Điều luật bán hàng." },
      { status: 400 }
    );
  }

  let slug = slugifySeller(shopName);
  const taken = await prisma.seller.findUnique({ where: { slug } });
  if (taken) {
    slug = `${slug}-${session!.user.id.slice(-5)}`;
  }

  const seller = await prisma.$transaction(async (tx) => {
    const created = await tx.seller.create({
      data: {
        userId: session!.user.id,
        shopName,
        slug,
        description: description || "Gian hàng mới trên MarketMMO.PRO.",
        phone,
        facebookLink,
        level: 1,
        verified: false,
      },
    });
    await tx.user.update({
      where: { id: session!.user.id },
      data: { role: "SELLER" },
    });
    return created;
  });

  try {
    await sendSystemMessage(
      session!.user.id,
      `Chúc mừng bạn đã trở thành người bán trên MarketMMO!\n\nGian hàng của bạn đã được kích hoạt thành công. Bây giờ bạn có thể:\n• Đăng tải sản phẩm mới\n• Quản lý đơn hàng và doanh thu\n• Tương tác với khách hàng qua hệ thống Chat\n\nHãy truy cập vào Quản Lý Bán Hàng để bắt đầu nhé!`
    );
  } catch {
    // bỏ qua — không chặn đăng ký bán hàng nếu gửi tin thất bại
  }

  return NextResponse.json({ slug: seller.slug });
}
