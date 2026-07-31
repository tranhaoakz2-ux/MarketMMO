import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deletePublicImage, saveSellerAvatar } from "@/lib/uploads";

// Seller tự đổi avatar gian hàng — `seller` lấy từ session server-side qua
// requireSeller() (KHÔNG nhận sellerId từ client) nên chỉ đổi được avatar
// của CHÍNH MÌNH. Ảnh cũ (nếu có) bị xoá sau khi lưu ảnh mới thành công —
// best-effort, không chặn response nếu xoá lỗi (xem deletePublicImage()).
export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh." }, { status: 400 });
  }

  let avatarUrl: string;
  try {
    avatarUrl = await saveSellerAvatar(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const oldAvatarUrl = seller!.avatarUrl;
  await prisma.seller.update({ where: { id: seller!.id }, data: { avatarUrl } });
  await deletePublicImage(oldAvatarUrl);

  return NextResponse.json({ avatarUrl });
}
