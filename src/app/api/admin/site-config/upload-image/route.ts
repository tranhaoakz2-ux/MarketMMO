import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { saveBannerImage } from "@/lib/uploads";

const VALID_SLOTS = ["banner_left_1", "banner_left_2", "banner_right_1", "banner_right_2"];

// Upload 1 ảnh banner mới — trả về URL, KHÔNG tự ghi vào SiteConfig (client
// gọi tiếp PATCH /api/admin/site-config với { updates: { [slot]: url } } để
// lưu, đồng bộ với luồng "Lưu"/"Khôi phục .env" chung của các field khác).
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const slot = String(form.get("slot") ?? "");
  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: "Vị trí banner không hợp lệ." }, { status: 400 });
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
