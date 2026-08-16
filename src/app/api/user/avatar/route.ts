import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { deletePublicImage, saveSellerAvatar } from "@/lib/uploads";

// Buyer tự đổi avatar CỦA CHÍNH MÌNH (User.image) — tái dùng saveSellerAvatar()
// dù tên hàm gắn "seller": bản thân hàm không có logic riêng cho seller (chỉ
// lưu vào thư mục "avatars", giới hạn 3MB, JPEG/PNG/WebP) nên dùng chung được
// cho cả buyer, tránh viết trùng logic upload/validate.
export async function POST(req: Request) {
  const { session, error } = await requireUser();
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

  const current = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { image: true },
  });
  await prisma.user.update({ where: { id: session!.user.id }, data: { image: avatarUrl } });
  await deletePublicImage(current?.image);

  return NextResponse.json({ avatarUrl });
}
