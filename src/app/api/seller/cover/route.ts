import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deletePublicImage, saveBannerImage } from "@/lib/uploads";

// Seller tự đổi ẢNH BÌA gian hàng — mirror 1:1 POST /api/seller/avatar,
// `seller` lấy từ session server-side qua requireSeller() (KHÔNG nhận
// sellerId từ client) nên chỉ đổi được bìa của CHÍNH MÌNH. Tái dùng
// saveBannerImage() (đã dùng cho banner trang chủ, 5MB — phù hợp ảnh bìa
// rộng hơn giới hạn 3MB của saveSellerAvatar()) thay vì dựng cơ chế upload
// mới. Ảnh cũ (nếu có) bị xoá sau khi lưu ảnh mới thành công — best-effort.
export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh." }, { status: 400 });
  }

  let coverUrl: string;
  try {
    coverUrl = await saveBannerImage(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const oldCoverUrl = seller!.coverUrl;
  await prisma.seller.update({ where: { id: seller!.id }, data: { coverUrl } });
  await deletePublicImage(oldCoverUrl);

  return NextResponse.json({ coverUrl });
}
