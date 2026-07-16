import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { contentTypeForPath, readUploadedFile } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ side: string }> }
) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const { side } = await params;
  if (side !== "front" && side !== "back") {
    return NextResponse.json({ error: "Không hợp lệ." }, { status: 400 });
  }

  const verification = await prisma.sellerVerification.findUnique({
    where: { sellerId: seller!.id },
  });
  if (!verification) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }

  const relativePath = side === "front" ? verification.frontImagePath : verification.backImagePath;
  try {
    const buffer = await readUploadedFile(relativePath);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": contentTypeForPath(relativePath),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy ảnh." }, { status: 404 });
  }
}
