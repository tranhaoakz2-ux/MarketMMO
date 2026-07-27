import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/queries";

// Công khai, không cần đăng nhập — cùng dữ liệu đã lộ ra qua sidebar "Bộ lọc"
// SSR ở /danh-muc/[slug] (getCategoryTree() lọc status=APPROVED + isActive=true).
// Dùng cho dropdown "Sản phẩm" 2 tầng trên Header (client component, không thể
// gọi thẳng Prisma) — xem ProductMegaMenu.tsx/MobileProductAccordion.tsx.
export async function GET() {
  const tree = await getCategoryTree();
  return NextResponse.json({ tree });
}
