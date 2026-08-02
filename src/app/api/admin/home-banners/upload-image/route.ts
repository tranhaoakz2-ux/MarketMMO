import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { saveBannerImage } from "@/lib/uploads";

// Upload 1 ảnh banner mới — trả về URL, KHÔNG tự ghi vào HomeBanner (client
// gọi tiếp POST/PATCH /api/admin/home-banners với { imageUrl: url } để lưu).
// Thay cho /api/admin/site-config/upload-image cũ (gắn cứng theo 4 slot
// SiteConfig, đã bỏ cùng hệ thống banner cũ) — dùng lại nguyên
// saveBannerImage() vốn đã generic, không cần đổi gì ở lib/uploads.ts.
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ảnh." }, { status: 400 });
  }

  try {
    const url = await saveBannerImage(file);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
