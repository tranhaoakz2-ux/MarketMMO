import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { readUploadedFile } from "@/lib/uploads";

// Cho admin tải file tool (.zip) để kiểm tra TRƯỚC KHI duyệt sản phẩm loại
// TOOL — mirror GET /api/orders/[orderItemId]/tool-file (buyer, sau khi mua)
// nhưng gate bằng requireAdmin() thay vì quyền sở hữu đơn hàng, vì đây là
// bước xem trước lúc duyệt, không phải buyer đã mua. KHÔNG giới hạn
// status="PENDING" — admin có thể tải lại để đối chiếu cả sản phẩm đã
// duyệt/từ chối trước đó nếu cần tra cứu.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { productType: true, toolFileUrl: true, toolFileName: true },
  });

  if (!product || product.productType !== "TOOL" || !product.toolFileUrl) {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }

  try {
    const buffer = await readUploadedFile(product.toolFileUrl);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(product.toolFileName ?? "tool.zip")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
}
