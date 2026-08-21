import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { isValidCtaHref } from "@/lib/banner-link";

// PATCH — sửa ảnh/tiêu đề/mô tả/CTA/ẩn-hiện/thứ tự của 1 banner. Chỉ update
// field nào có mặt trong body (giữ nguyên field khác) — cùng quy ước với
// PATCH /api/admin/category-tree/[id]. Truyền chuỗi rỗng "" cho
// title/description/ctaLabel/ctaHref/imageUrl = XOÁ field đó (null hoá,
// quay về chữ/ảnh mặc định trong code) — khác "không truyền field" (giữ
// nguyên), đây là cách duy nhất để admin "khôi phục mặc định" 1 field riêng
// lẻ mà không phải xoá cả banner.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.homeBanner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy banner." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const data: {
    imageUrl?: string | null;
    title?: string | null;
    description?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  // Banner NHỎ (SMALL_1/SMALL_2) render cả thẻ thành href công khai cho MỌI
  // khách trang chủ — chặn cứng định dạng sai/nguy hiểm (javascript:, data:...).
  // Banner LỚN (existing.slot==="LARGE") giữ nguyên hành vi cũ 100% — không
  // validate, không đổi gì ở luồng đang chạy đúng.
  if (
    existing.slot !== "LARGE" &&
    typeof body.ctaHref === "string" &&
    body.ctaHref.trim() &&
    !isValidCtaHref(body.ctaHref)
  ) {
    return NextResponse.json(
      { error: "Link đích không hợp lệ — phải bắt đầu bằng \"/\" (nội bộ) hoặc \"http(s)://\" (bên ngoài)." },
      { status: 400 }
    );
  }

  for (const key of ["imageUrl", "title", "description", "ctaLabel", "ctaHref"] as const) {
    if (typeof body[key] === "string") {
      data[key] = body[key].trim() || null;
    }
  }
  if (Number.isInteger(body.sortOrder)) data.sortOrder = body.sortOrder;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  const banner = await prisma.homeBanner.update({ where: { id }, data });

  await logAdminAction({
    adminId: session!.user!.id,
    action: `Sửa banner trang chủ (${existing.slot})`,
    targetType: "HomeBanner",
    targetId: id,
  });

  return NextResponse.json({ banner });
}

// DELETE — CHỈ cho xoá slide slot="LARGE" (banner nhiều slide, xoá bớt hợp
// lý). "SMALL_1"/"SMALL_2" luôn phải có đúng 1 dòng để trang chủ có chỗ
// hiện — chặn xoá, admin muốn "reset" thì PATCH từng field về rỗng thay vì
// xoá cả dòng.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.homeBanner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy banner." }, { status: 404 });
  }
  if (existing.slot !== "LARGE") {
    return NextResponse.json(
      { error: "Không thể xoá banner nhỏ cố định — sửa nội dung thay vì xoá." },
      { status: 400 }
    );
  }

  await prisma.homeBanner.delete({ where: { id } });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Xoá slide banner lớn trang chủ",
    targetType: "HomeBanner",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
