import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isAllowedImageType, saveVerificationImage } from "@/lib/uploads";

export async function GET() {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const verification = await prisma.sellerVerification.findUnique({
    where: { sellerId: seller!.id },
    select: { status: true, fullName: true, idNumber: true, adminNote: true, createdAt: true },
  });
  return NextResponse.json({ verification });
}

export async function POST(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const fullName = String(form.get("fullName") ?? "").trim();
  const idNumber = String(form.get("idNumber") ?? "").trim();
  const frontImage = form.get("frontImage");
  const backImage = form.get("backImage");

  if (!fullName || fullName.length < 3) {
    return NextResponse.json({ error: "Vui lòng nhập họ tên đầy đủ." }, { status: 400 });
  }
  if (!/^\d{9,12}$/.test(idNumber)) {
    return NextResponse.json(
      { error: "Số CCCD/CMND không hợp lệ (9-12 chữ số)." },
      { status: 400 }
    );
  }
  if (!(frontImage instanceof File) || !(backImage instanceof File)) {
    return NextResponse.json({ error: "Vui lòng chọn đủ ảnh mặt trước và mặt sau." }, { status: 400 });
  }
  if (!isAllowedImageType(frontImage.type) || !isAllowedImageType(backImage.type)) {
    return NextResponse.json(
      { error: "Ảnh phải ở định dạng JPEG, PNG hoặc WebP." },
      { status: 400 }
    );
  }

  try {
    const [frontPath, backPath] = await Promise.all([
      saveVerificationImage(seller!.id, "front", frontImage),
      saveVerificationImage(seller!.id, "back", backImage),
    ]);

    await prisma.sellerVerification.upsert({
      where: { sellerId: seller!.id },
      create: {
        sellerId: seller!.id,
        fullName,
        idNumber,
        frontImagePath: frontPath,
        backImagePath: backPath,
        status: "PENDING",
      },
      update: {
        fullName,
        idNumber,
        frontImagePath: frontPath,
        backImagePath: backPath,
        status: "PENDING",
        adminNote: null,
        reviewedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
